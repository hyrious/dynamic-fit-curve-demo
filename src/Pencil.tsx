import React, { Component } from "react";
import FitCurve from "./fit-curve-worker?worker";

const fitCurve = new FitCurve();
(window as any).fitCurve = fitCurve;

interface Props {
    container: HTMLDivElement;
    size: { width: number; height: number };
}

interface State {
    reset: boolean;
    points: { x: number; y: number }[];
    type: "L" | "Q";
}

export default class Pencil extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { reset: true, points: [], type: "L" };
    }

    componentDidMount() {
        const { container } = this.props;
        if (!container) return;
        container.addEventListener("pointerdown", this.handler);
        container.addEventListener("pointermove", this.handler);
        container.addEventListener("pointerup", this.handler);
        container.addEventListener("touchmove", this.preventDefault, { passive: false });
    }

    componentWillUnmount() {
        const { container } = this.props;
        container.removeEventListener("pointerdown", this.handler);
        container.removeEventListener("pointermove", this.handler);
        container.removeEventListener("pointerup", this.handler);
        container.removeEventListener("touchmove", this.preventDefault);
    }

    preventDefault = (e: TouchEvent) => {
        e.preventDefault();
    };

    handler = (e: PointerEvent) => {
        e.preventDefault();
        if (!e.isPrimary) {
            return;
        }
        if (!e.pressure) {
            this.setState({ reset: true });
        } else {
            const { container } = this.props;
            const { offsetTop, offsetLeft } = container;
            const { reset, points } = this.state;
            this.setState({
                reset: false,
                points: (reset ? [] : points).concat([
                    {
                        x: (e.x - offsetLeft) | 0,
                        y: (e.y - offsetTop) | 0,
                    },
                ]),
            });
        }
    };

    render() {
        const { size } = this.props;
        const { type, points } = this.state;
        return (
            <>
                <svg
                    stroke="#000000"
                    fill="transparent"
                    strokeWidth={2}
                    strokeLinecap="round"
                    width={size.width}
                    height={size.height}
                >
                    <text x={20} y={30} className="info">
                        {points.length}
                    </text>

                    {points.length > 0 && this.renderLine()}
                </svg>
                <div className="ctrl">
                    <input
                        type="checkbox"
                        id="ctrl"
                        checked={type === "Q"}
                        onChange={this.switchType}
                    />
                    <label htmlFor="ctrl">type: {type}</label>
                </div>
            </>
        );
    }

    switchType = () => {
        this.setState({ type: this.state.type === "L" ? "Q" : "L" });
    };

    renderLine() {
        const { points, type } = this.state;
        if (points.length < 2) return null;

        if (type === "L") {
            return (
                <path d={points.map(({ x, y }, i) => `${i === 0 ? "M" : "L"}${x} ${y}`).join("")} />
            );
        }

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
