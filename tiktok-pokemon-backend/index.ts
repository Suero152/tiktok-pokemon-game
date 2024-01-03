import fastify from "fastify"
import fastifyRedis, { FastifyRedis } from "@fastify/redis"
import fastifySocket from "fastify-socket.io"
import dotenv from "dotenv"
import axios from "axios"
import { WebcastPushConnection } from 'tiktok-live-connector'
import { Server } from "socket.io"
dotenv.config()

const timeToGuess = 30000
let connected = false

async function connect() {
    // Set your tiktok username below, if the user is live the backend will start working.
    let tiktokLiveConnection = new WebcastPushConnection("yourtiktokusername");
    tiktokLiveConnection.connect().then(state => {
        console.info('Successfuly connected to TikTok Live API.')
        connected = true
    }).catch(err => {
        // Retry after 30 secs
        console.log(err)
        console.error("User is currently offline or doesn't exist. Retrying after 10 secs.");
        setTimeout(connect, 10000);
    })
    return tiktokLiveConnection
}

async function generateRandomPokemonPokedexId() {
    return Math.floor(Math.random() * 898) + 1
}

async function generateNewPokemon(io: Server, redis: FastifyRedis) {
    if (!connected) {
        console.log("User is offline, won't generate new Pokémon.")
        return;
    }


    const randomPokemon = await generateRandomPokemonPokedexId()
    const pokemonUrl = `https://pokeapi.co/api/v2/pokemon/${randomPokemon}`
    await axios.get(pokemonUrl).then(response => {
        const pokemonData = response.data
        const pokemon = {
            name: pokemonData.name,
            image: pokemonData.sprites.other['official-artwork'].front_default,
            id: pokemonData.id
        }
        console.log('Generated new Pokémon.', pokemon.name)

        io.emit('new_pokemon', {
            newPokemon: pokemon,
            timeToGuess: timeToGuess
        })
        redis.hset('currentPokemon', pokemon)
        redis.set('cooldown', 'false')
        redis.set('last_leaderboard', JSON.stringify([]))

    }).catch(err => {
        console.error(err)
    })

    setTimeout(() => {
        redis.set('cooldown', 'true')
        io.emit('reveal')
    }, (timeToGuess + (timeToGuess / 2)) - (timeToGuess / 2))

}

async function startServer() {
    const server = await fastify({})

    await server.register(fastifyRedis, { url: process.env.REDIS_URL || 'redis://127.0.0.1' })
    const { redis } = server

    const listener = await redis.duplicate()
    await listener.config("SET", "notify-keyspace-events", "KEA")
    await listener.subscribe("__keyevent@0__:set", "last_leaderboard")
    listener.on("message", async (channel, message) => {
        if (channel === "__keyevent@0__:set" && message === "last_leaderboard") {
            const lastLeaderboard = JSON.parse(await redis.get('last_leaderboard') || '[]')
            await io.emit('leaderboard_update', lastLeaderboard)
        }
    })
    

    await server.register(fastifySocket, {
        cors: {
            origin: "http://localhost:3000",
            methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
        },
    })
    const { io } = server

    connect().then(tiktokLiveConnection => {
        tiktokLiveConnection.on('chat', async (data) => {
            // data.nickname, data.comment

            const currentPokemonName = await redis.hget('currentPokemon', 'name')
            if (currentPokemonName && data.comment.toLowerCase() === currentPokemonName.toLowerCase()) {
                const cooldownStatus = JSON.parse(await redis.get('cooldown') || 'true')

                if( !cooldownStatus ){
                    console.log('Correct answer!', data.nickname, data.comment)
                    const lastLeaderboard = JSON.parse(await redis.get('last_leaderboard') || '[]')
                    if (lastLeaderboard.length < 3 && !lastLeaderboard.find((user: any) => user.userId === data.userId)){
                        let user = {
                            nickname: data.nickname,
                            userId: data.userId,
                            profilePictureUrl: data.profilePictureUrl,
                        }
                        lastLeaderboard.push(user)
                        await redis.set('last_leaderboard', JSON.stringify(lastLeaderboard))
                    }
                }else{
                    console.log('Correct answer, but on cooldown.', data.nickname, data.comment)
                }

            }
        })
    })


    io.on('connection', (client) => {
        console.log('New client connected.', client.id)

    })

    // Declare a route
    server.get('/', async function handler(request, reply) {
        return 'Hey! ;)'
    })

    // Run the server


    server.listen({ port: 5000 }, (err, address) => {
        if (err) {
            console.error(err)
            process.exit(1)
        }
        console.log(`Server listening at ${address}`)

        setTimeout(() => {
            generateNewPokemon(io, redis)
            setInterval(() => { generateNewPokemon(io, redis) }, timeToGuess + (timeToGuess / 2))
        }, 6500)
    })
}

startServer().catch(err => {
    console.error("Error starting the server:", err);
});
