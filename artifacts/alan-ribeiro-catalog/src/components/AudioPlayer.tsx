import { usePlayer } from "@/contexts/PlayerContext";
import { AudioPlayerByStyle } from "./AudioPlayerStyles";
import { AnimatePresence } from "framer-motion";

export function AudioPlayer() {
  const { playerStyle, cardMode } = usePlayer();
  // When an iPod card is in view and playing, hide the global player
  return (
    <AnimatePresence>
      {!cardMode && <AudioPlayerByStyle style={playerStyle} />}
    </AnimatePresence>
  );
}