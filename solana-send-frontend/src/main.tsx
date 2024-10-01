import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { ToastContainer } from 'react-toastify'
import './index.css'
import 'react-toastify/dist/ReactToastify.css'
import WalletContextProvider from './components/WalletContextProvider.tsx'
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WalletContextProvider>
      <App />
      <ToastContainer
        position="bottom-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </WalletContextProvider>
  </StrictMode>,
)
