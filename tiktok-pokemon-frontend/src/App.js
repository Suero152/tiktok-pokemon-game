import Router from './routes';
// eslint-disable-next-line
import { socket } from './socket';
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
import './dist/css/custom_bootstrap.scss'
import './dist/css/global.css'
function App() {
  return (
    <div className="App">
      <Router/>
    </div>
  );
}

export default App;