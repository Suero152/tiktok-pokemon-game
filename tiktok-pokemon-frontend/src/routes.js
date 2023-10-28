import React from 'react'
import { BrowserRouter, Routes, Route} from 'react-router-dom'
import GameScreen from './screens/gameScreen'

const Router = () =>{
    return(

        <BrowserRouter>
            <Routes>
              <Route exact path='/' element={<GameScreen/>}/>
            </Routes>
        </BrowserRouter>

    )
}
export default Router