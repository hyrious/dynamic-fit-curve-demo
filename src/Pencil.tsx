import React, { ChangeEvent, Component, createRef } from "react";
import type { Curve } from "./fit-curve-worker";
import FitCurve from "./fit-curve-worker?worker";
import { Pen, StrokeProps } from "./Pen";

const fitCurve = new FitCurve();
(window as any).fitCurve = fitCurve;

interface Props {
    container: HTMLDivElement;
    size: { width: number; height: number };
}

interface State {
    reset: boolean;
    points: { x: number; y: number }[];
    curves?: ReadonlyArray<Curve>;
    elapsed: number;
    error: number;
    type: "L" | "Q";
    useFitCurve: boolean;
    log: string;
    pens: Array<StrokeProps>;
}

const ADD = (a: number, b: number): number => a + b;

export default class Pencil extends Component<Props, State> {
    readonly ctrlRef = createRef<HTMLDivElement>();

    startTime = 0;

    constructor(props: Props) {
        super(props);
        this.state = {
            reset: true,
            points: [],
            elapsed: 0,
            type: "Q",
            error: 5,
            useFitCurve: false,
            log: "",
            pens: [],
        };
    }

    componentDidMount() {
        const { container } = this.props;
        if (!container) return;
        container.addEventListener("pointerdown", this.handler);
        container.addEventListener("pointermove", this.handler);
        container.addEventListener("pointerup", this.finish);
        container.addEventListener("touchmove", this.preventDefault, { passive: false });
        fitCurve.onmessage = this.onmessage;
    }

    componentWillUnmount() {
        const { container } = this.props;
        container.removeEventListener("pointerdown", this.handler);
        container.removeEventListener("pointermove", this.handler);
        container.removeEventListener("pointerup", this.finish);
        container.removeEventListener("touchmove", this.preventDefault);
        fitCurve.onmessage = null;
    }

    preventDefault = (e: TouchEvent) => {
        e.preventDefault();
    };

    handler = (e: PointerEvent) => {
        if ((e.target as HTMLElement).tagName !== "svg") {
            return;
        }
        e.preventDefault();

        if (!e.pressure) {
            this.setState({ reset: true, elapsed: 0 });
        } else {
            const { container } = this.props;
            const { offsetTop, offsetLeft } = container;
            const { reset, points } = this.state;
            this.setState({
                reset: false,
                elapsed: 0,
                points: (reset ? [] : points).concat([
                    {
                        x: (e.x - offsetLeft) | 0,
                        y: (e.y - offsetTop) | 0,
                    },
                ]),
                curves: [],
                log: `id = ${e.pointerId}`,
            });
        }
    };

    finish = (e: PointerEvent) => {
        e.preventDefault();

        const { points, curves } = this.state;
        if (!points.length) return;
        this.setState({
            points: [],
            curves: [],
            pens: this.state.pens.concat([
                { points: points.slice(), curves: curves?.slice(), type: "Q" },
            ]),
        });

        if (!this.state.useFitCurve) return;
        this.fitCurve();
    };

    fitCurve = () => {
        const id = this.state.pens.length - 1;
        const target = this.state.pens[id];
        this.startTime = Date.now();
        if (target.points.length > 1) {
            fitCurve.postMessage({ id, path: target.points.slice(), error: this.state.error });
        }
    };

    onmessage = (e: MessageEvent<{ id: number; curves: ReadonlyArray<Curve> }>) => {
        const { id, curves } = e.data;
        const pen = this.state.pens[id];
        pen.curves = curves;
        this.setState({
            pens: [...this.state.pens],
            elapsed: Date.now() - this.startTime,
        });
    };

    sumCurves() {
        return this.state.pens.map(e => e.curves?.length || 0).reduce(ADD, 0);
    }

    sunPoints() {
        return this.state.points.length + this.state.pens.map(e => e.points.length).reduce(ADD, 0);
    }

    render() {
        const { size } = this.props;
        const { pens, type, curves, points, elapsed, error, useFitCurve, log } = this.state;
        return (
            <>
                {pens.map((e, i) => (
                    <Pen {...size} {...e} key={i} />
                ))}
                <Pen {...size} points={points} curves={curves} type={type} />
                <div className="info">
                    {this.sumCurves()} / {this.sunPoints()}&nbsp; ({elapsed}ms,{" "}
                    {this.state.pens.length} strokes) {log}
                </div>
                <div className="ctrl" ref={this.ctrlRef} onPointerDown={e => e.stopPropagation()}>
                    <input
                        type="checkbox"
                        id="ctrl"
                        checked={type === "Q"}
                        onChange={this.switchType}
                    />
                    <label htmlFor="ctrl">type: {type}</label>
                    <div className="line-wrap"></div>
                    <input
                        id="ctrl-error"
                        type="range"
                        min="0.1"
                        max="10"
                        step="0.1"
                        value={error}
                        onChange={this.setError}
                    />
                    <label htmlFor="ctrl-error">error: {error}</label>
                    <div className="line-wrap"></div>
                    <input
                        type="checkbox"
                        id="use-worker"
                        checked={useFitCurve}
                        onChange={this.switchWorker}
                    />
                    <label htmlFor="use-worker">fit curve (worker)</label>
                    <button onClick={this.fitCurve}>Do It Now</button>
                </div>
            </>
        );
    }

    setError = (e: ChangeEvent<HTMLInputElement>) => {
        this.setState({ error: e.target.valueAsNumber });
    };

    switchType = () => {
        this.setState({ type: this.state.type === "L" ? "Q" : "L" });
    };

    switchWorker = () => {
        this.setState({ useFitCurve: !this.state.useFitCurve });
    };

    renderLine() {
        let { points, curves, type } = this.state;
        if (points.length < 2) return null;

        if ((curves?.length || 0) > 1) {
            const parts = [];
            for (let i = 0; i < curves!.length; ++i) {
                const [a, b, c, d] = curves![i];
                if (i === 0) {
                    parts.push(`M${a.x} ${b.y}`);
                }
                parts.push(`C${b.x} ${b.y}, ${c.x} ${c.y}, ${d.x} ${d.y}`);
            }
            return <path d={parts.join("\n")} />;
        }

        if (type === "L") {
            return (
                <path d={points.map(({ x, y }, i) => `${i === 0 ? "M" : "L"}${x} ${y}`).join("")} />
            );
        }

        // 0. easy part: remove odd points
        // points = points.filter((e, i) => i % 2 === 0);
        if (points.length < 2) return null;

        const parts = [`M${points[0].x} ${points[0].y}`];

        // 1. Line to mid(p0 -> p1)
        const mid0 = mid(points[0], points[1]);
        parts.push(`L${mid0.x} ${mid0.y}`);

        // 2. Q to mid(p1 -> p2), ctrl = p1
        for (let i = 1; i + 1 < points.length; i += 1) {
            let ctrl = points[i];
            let to = mid(ctrl, points[i + 1]);
            parts.push(`Q${ctrl.x} ${ctrl.y}, ${to.x} ${to.y}`);
        }
        // 3. Line to last point
        const last = points[points.length - 1];
        parts.push(`L${last.x} ${last.y}`);

        return <path d={parts.join("\n")} />;
    }
}

interface Point {
    x: number;
    y: number;
}

function mid(p1: Point, p2: Point): Point {
    return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
}
