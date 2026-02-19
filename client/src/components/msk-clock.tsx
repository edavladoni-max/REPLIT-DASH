import { useState, useEffect } from "react";

export function MskClock() {
  const [time, setTime] = useState("");

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const msk = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Moscow" }));
      setTime(
        msk.toLocaleTimeString("ru-RU", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="font-mono text-sm tabular-nums text-muted-foreground" data-testid="text-msk-clock">
      {time} MSK
    </span>
  );
}
