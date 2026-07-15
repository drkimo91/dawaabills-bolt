import { useState, useEffect } from "react";

export default function LiveTimer({ startTime }) {
  const [elapsed, setElapsed] = useState("");

  useEffect(() => {
    const update = () => {
      const diffMs = Date.now() - new Date(startTime).getTime();
      const hours = Math.floor(diffMs / 3600000);
      const minutes = Math.floor((diffMs % 3600000) / 60000);
      const seconds = Math.floor((diffMs % 60000) / 1000);
      setElapsed(`${hours}س ${minutes}د ${seconds}ث`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  return <span className="tabular-nums">{elapsed}</span>;
}