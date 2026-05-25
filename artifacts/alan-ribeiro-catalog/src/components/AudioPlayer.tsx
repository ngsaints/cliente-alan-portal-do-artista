import { usePlayer } from "@/contexts/PlayerContext";
import { AudioPlayerByStyle } from "./AudioPlayerStyles";

export function AudioPlayer() {
  const { playerStyle } = usePlayer();
  return <AudioPlayerByStyle style={playerStyle} />;
}