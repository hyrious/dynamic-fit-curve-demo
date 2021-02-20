import React, { StrictMode, useEffect, useRef } from "react";
import { render } from "react-dom";
import { usePencil } from "./src/Pencil";

function App() {
    const pencil = usePencil();
    const container = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (container.current) {
            pencil.mount(container.current);
            return () => pencil.unmount();
        }
    }, []);

    return (
        <>
            <div
                style={{
                    position: "fixed",
                    margin: "2em",
                    zIndex: 1,
                    userSelect: "none",
                }}
            >
                <div>已拟合的曲线数量 {pencil.curvesLength}</div>
                <div>待处理的输入数量 {pencil.pathLength}</div>
                <div>节约了的输入占比 {Math.floor(pencil.reducedRate * 10000) / 100}%</div>
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        lineHeight: 1.58,
                    }}
                >
                    <span>MaxError:</span>
                    <input
                        style={{ margin: "0 .5em", width: "50vw" }}
                        type="range"
                        value={pencil.maxError}
                        step={0.1}
                        onChange={(e) => {
                            pencil.maxError = e.target.valueAsNumber;
                        }}
                    />
                    <span>{pencil.maxError}</span>
                </div>
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        lineHeight: 1.58,
                    }}
                >
                    <input
                        id="debug"
                        type="checkbox"
                        checked={pencil.showPoints}
                        onChange={(e) => {
                            pencil.showPoints = e.target.checked;
                        }}
                    />
                    <label htmlFor="debug">Debug (show points &amp; current path):</label>
                </div>
            </div>
            <div
                ref={container}
                style={{
                    position: "absolute",
                    inset: 0,
                    margin: "2ch",
                    boxShadow: `
                        0 2.8px 2.2px rgba(0, 0, 0, 0.02),
                        0 6.7px 5.3px rgba(0, 0, 0, 0.028),
                        0 12.5px 10px rgba(0, 0, 0, 0.035),
                        0 22.3px 17.9px rgba(0, 0, 0, 0.042),
                        0 41.8px 33.4px rgba(0, 0, 0, 0.05),
                        0 100px 80px rgba(0, 0, 0, 0.07)`,
                    borderRadius: "1em",
                    backgroundColor: "white",
                }}
            >
                {pencil.render()}
            </div>
        </>
    );
}

render(<StrictMode children={<App />} />, document.getElementById("app"));
