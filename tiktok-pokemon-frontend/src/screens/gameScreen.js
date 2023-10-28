import { Container, Row, Col, Image, Spinner, ProgressBar } from 'react-bootstrap'
import PokemonPlaceholder from '../dist/images/pokemon.png'
import { socket } from '../socket';
import { useEffect, useState, useRef } from 'react';
import { useAnimate } from "framer-motion"

function GameScreen() {

  const timeToGuess = useRef(30000)
  const interval = useRef(null)

  const [leaderboard, setLeaderboard] = useState([])
  const [countdown, setCountdown] = useState(0)
  const [progressBarPercentage, setProgressBarPercentage] = useState(100)
  const [hidePokemon, setHidePokemon] = useState(false)
  const [currentPokemon, setCurrentPokemon] = useState(null)

  const [leaderboardScope, leaderboardAnimate] = useAnimate()
  const [pokemonScope, pokemonAnimate] = useAnimate()

  const defaultPfpLink = "https://p7.hiclipart.com/preview/355/848/997/computer-icons-user-profile-google-account-photos-icon-account.jpg"

  // Server interactions setup

  const serverInteractions = {


    startInteractions: () => {
      socket.on('new_pokemon', (data) => {

        // move anim to an effect
        setHidePokemon(true)
        const pokemonSequence = [
          [
            "#pokemon-image",
            { rotate: 360 }, { duration: 0.5 }
          ],
          [
            "#pokemon-image",
            { rotate: 0 }, { duration: 0.5 }
          ]
        ]
        pokemonAnimate(pokemonSequence)
        pokemonAnimate('#pokemon-image', { filter: "contrast(0%) brightness(80%)" }, { duration: 0.5 })
        setCurrentPokemon(data.newPokemon)
        setCountdown(data.timeToGuess)



        timeToGuess.current = data.timeToGuess

        if (!interval.current) {
          interval.current = setInterval(() => {
            setCountdown((countdown) => {

              if (countdown > 0) {

                return countdown - 1000
              } else {
                clearInterval(interval.current)
                interval.current = null
                return 0
              }

            })
          }, 1000)
        }


      })

      socket.on('reveal', () => {
        pokemonAnimate('#pokemon-image', { filter: "contrast(100%) brightness(100%)" }, { duration: 0.5 })
      })

      socket.on('leaderboard_update', (newLeaderboard) => {
        setLeaderboard(newLeaderboard)
      })

    },
    stopInteractions: () => {
      socket.off('new_pokemon')
      socket.off('reveal')
      socket.off('leaderboard_update')
    }

  }

  // UseEffect and Socket.io
  useEffect(() => {
    /* SOCKET FUNCTIONS HERE */
    serverInteractions.startInteractions()
    return () => {
      serverInteractions.stopInteractions()
    }

  }, []);

  useEffect(() => {

    if (leaderboard.length >= 1 && leaderboard.length <= 3) {
      let className = '#first-place'

      if (leaderboard.length === 1){
        className = '#first-place'
      }else if(leaderboard.length === 2){
        className = '#second-place'
      }else if(leaderboard.length === 3){
        className = '#third-place'
      }

      const leaderboardSequence = [
        [
          className,
          {scale: 1.45},
          {duration: 0.15}
        ],
        [
          className,
          {scale: 1},
          {duration: 0.15}
        ]
      ]
      leaderboardAnimate(leaderboardSequence)
    }

  }, [leaderboard])

  useEffect(() => {
    setProgressBarPercentage((countdown / timeToGuess.current) * 100)
  }, [countdown])


  return (
    <Container fluid className='text-center vh-100 background p-4 d-flex justify-content-center'>
      <Row className='mw-50 w-50'>
        <Col className='mh-25 col-12 align-self-start justify-content-center d-flex'>
          <div>
            <h1>
              Quem é esse Pokémon?
            </h1>
            <p>
            </p>
            <ProgressBar className='h-50' now={progressBarPercentage} label={`${countdown / 1000}s`} />
          </div>
        </Col>


        <Col ref={pokemonScope} className='mh-25 col-12 align-self-start justify-content-center d-flex'>
          <Row>
            <Col id="pokemon-image">
              {

                !currentPokemon ? (<Spinner />) :
                  (
                    // If hidePokemon turn the pokemon image to black
                    <Image style={{ width: '400px' }} src={currentPokemon.image} />
                  )

              }
            </Col>
          </Row>
        </Col>

        <Col ref={leaderboardScope} className='leaderboard col-12 align-self-end justify-content-center d-flex mb-5'>
          <Row className='gx-5'>
            <div id='first-place' className='col col-4'>
              <h4>1° Lugar</h4>
              <p>{leaderboard && leaderboard.length >= 1 && leaderboard[0].nickname || ('Ninguém')}</p>
              <Image style={{ width: '8.6rem' }} className='' src={leaderboard && leaderboard.length >= 1 && leaderboard[0].profilePictureUrl || defaultPfpLink} roundedCircle />
            </div>
            <div id='second-place' className='col col-4'>
              <h4>2° Lugar</h4>
              <p>{leaderboard && leaderboard.length >= 2 && leaderboard[1].nickname || ('Ninguém')}</p>
              <Image style={{ width: '8.6rem' }} src={leaderboard && leaderboard.length >= 2 && leaderboard[1].profilePictureUrl || defaultPfpLink} roundedCircle />
            </div>
            <div id='third-place' className='col col-4'>
              <h4>3° Lugar</h4>
              <p>{leaderboard && leaderboard.length >= 3 && leaderboard[2].nickname || ('Ninguém')}</p>
              <Image style={{ width: '8.6rem' }} src={leaderboard && leaderboard.length >= 3 && leaderboard[2].profilePictureUrl || defaultPfpLink} roundedCircle />
            </div>
          </Row>
        </Col>

      </Row>
    </Container>
  );
}

export default GameScreen;