/**
 * AuthWall — shown by route guards when an unauthenticated visitor tries to
 * reach a protected page.
 *
 * Renders the public Home page in the background (pointer-events disabled so
 * nothing is accidentally clickable), and opens the LoginModal on top of it.
 * The modal's own backdrop (bg-[#14212b]/45 + backdrop-blur-md) dims and
 * blurs the home content — exactly the same visual as clicking "Login" in
 * the Navbar.
 *
 * After a successful login the modal redirects the user to the correct
 * destination (back to `from` if their role permits, otherwise their own
 * dashboard). Dismissing the modal (× or click-away) navigates to Home.
 */
import { useNavigate } from 'react-router-dom';
import LoginModal from '../forms/LoginModal';
import Home from '../../pages/Home';

export default function AuthWall({ from }) {
  const navigate = useNavigate();

  // Closing without logging in → go to the public landing page.
  const handleClose = () => navigate('/', { replace: true });

  return (
    <>
      {/*
        Home page rendered as a non-interactive background.
        pointer-events-none prevents any clicks reaching links/buttons.
        The LoginModal's own backdrop-blur-md + bg-[#14212b]/45 overlay
        dims and blurs this content at ~40%, matching the Navbar login UX.
      */}
      <div className="pointer-events-none select-none" aria-hidden="true">
        <Home />
      </div>

      {/* Modal is always open; its own fixed backdrop covers the Home content */}
      <LoginModal isOpen onClose={handleClose} from={from} />
    </>
  );
}
