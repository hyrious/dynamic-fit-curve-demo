import React, { StrictMode, useEffect, useRef, useState } from "react";
import { render } from "react-dom";
import Pencil from "./src/Pencil";
import "./style.css";

function App() {
    const [container, setContainer] = useState<HTMLDivElement | null>(null);
    const [size, setSize] = useState({ width: 0, height: 0 });

    useEffect(() => {
        if (container) {
            const { width, height } = container.getBoundingClientRect();
            setSize({ width, height });
        } else {
            setSize({ width: 0, height: 0 });
        }
    }, [container]);

    return (
        <div ref={setContainer} className="container">
            {container && <Pencil container={container} size={size} />}
        </div>
    );
}

render(<StrictMode children={<App />} />, document.getElementById("app"));
