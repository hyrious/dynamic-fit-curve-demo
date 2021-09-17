import React from "react";
import type { Curve } from "./fit-curve-worker";

export interface StrokeProps {
    points: { x: number; y: number }[];
    curves?: ReadonlyArray<Curve>;
    type: "L" | "Q";
}

export type PenProps = StrokeProps & { width: number; height: number };

export const Pen: React.FC<PenProps> = React.memo(({ width, height, ...rest }) => {
    return (
        <svg
            stroke="#000000"
            fill="transparent"
            strokeWidth={2}
            strokeLinecap="round"
            width={width}
            height={height}
        >
            <Stroke {...rest} />
        </svg>
    );
});

function Stroke(props: StrokeProps) {
    let { points, curves, type } = props;
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
        return <path d={points.map(({ x, y }, i) => `${i === 0 ? "M" : "L"}${x} ${y}`).join("")} />;
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

interface Point {
    x: number;
    y: number;
}

function mid(p1: Point, p2: Point): Point {
    return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
}
