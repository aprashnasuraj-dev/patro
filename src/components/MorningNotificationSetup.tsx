import { useEffect } from "react";
import { enableLocalMorningGreeting, getLocalMorningGreeting, morningOfferSeen } from "../localMorning";

// Installation starts greetings in the background. Browser/OS permission is still required.
export function MorningInstallationCompletion({ installed }: { installed: boolean }) {
  useEffect(() => {
    if (!installed || morningOfferSeen() || getLocalMorningGreeting().enabled) return;
    void enableLocalMorningGreeting();
  }, [installed]);
  return null;
}
