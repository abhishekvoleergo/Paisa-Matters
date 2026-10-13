import Navbar from "./components/Navbar";
import HeroScrollSequence from "./components/hero/HeroScrollSequence";
import StorySections from "./components/sections/StorySections";
import LoginGate from "./components/sections/LoginGate";
import Footer from "./components/sections/Footer";

export default function Home() {
  return (
    <main className="page-shell">
      <div className="site-frame">
      <Navbar />
      <HeroScrollSequence />
      <StorySections />
      <LoginGate />
      <Footer />
      </div>
    </main>
  );
}
