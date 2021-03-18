import React, { useState } from "react";
import { Curve, fitCurve, Point } from "./fit-curve";

export type LastPathType = "curve" | "rough" | "alt";

export const DescForLastPathType: Record<LastPathType, string> = {
    curve: "fit curve 的最后一段曲线（已缓存）",
    rough: "直接连折线",
    alt: "去掉一部分点，再计算 fit curve",
};

export class Pencil {
    public static DefaultMaxError = 5;

    private _maxError = Pencil.DefaultMaxError;
    private _showPoints = true;
    private _lastPathType: LastPathType = "rough";

    private isDrawing = false;
    private offsetLeft = 0;
    private offsetTop = 0;
    private path: Point[] = [];
    private activeCurve?: Curve;
    private curves: Curve[] = [];
    private width = 0;
    private height = 0;
    private dropCount = 0;

    public get curvesLength() {
        return this.curves.length;
    }

    public get pathLength() {
        return this.path.length;
    }

    public get maxError() {
        return this._maxError;
    }

    public set maxError(val: number) {
        this._maxError = val;
        this.forceUpdate();
    }

    public get showPoints() {
        return this._showPoints;
    }

    public set showPoints(val: boolean) {
        this._showPoints = val;
        this.forceUpdate();
    }

    public get lastPathType() {
        return this._lastPathType;
    }

    public set lastPathType(val: LastPathType) {
        this._lastPathType = val;
        this.forceUpdate();
    }

    public get reducedRate() {
        return this.dropCount > 0 ? 1 - this.curves.length / this.dropCount : 0;
    }

    public constructor(private readonly forceUpdate: () => void) {}

    public mount(container: HTMLDivElement) {
        const { offsetLeft, offsetTop } = container;
        const { width, height } = container.getBoundingClientRect();
        this.width = width;
        this.height = height;
        this.offsetLeft = offsetLeft;
        this.offsetTop = offsetTop;
        container.addEventListener("mousedown", this.mousedown);
        container.addEventListener("mousemove", this.mousemove);
        container.addEventListener("mouseup", this.mouseup);
        container.addEventListener("mouseleave", this.mouseup);
        container.addEventListener("touchstart", this.touchstart);
        container.addEventListener("touchmove", this.touchmove, false);
        container.addEventListener("touchend", this.mouseup);
        container.addEventListener("touchcancel", this.mouseup);
    }

    public unmount() {
        this.offsetLeft = 0;
        this.offsetTop = 0;
    }

    private touchstart = ({ touches }: TouchEvent) => {
        this.mousedown({ x: touches[0].clientX, y: touches[0].clientY } as MouseEvent);
    };

    private touchmove = (e: TouchEvent) => {
        e.preventDefault();
        this.mousemove({ x: e.touches[0].clientX, y: e.touches[0].clientY } as MouseEvent);
    };

    private mousedown = ({ x, y }: MouseEvent) => {
        const point = {
            x: x - this.offsetLeft,
            y: y - this.offsetTop,
        };
        this.path = [point];
        this.isDrawing = true;
        this.curves = [];
        this.activeCurve = undefined;
        this.dropCount = 0;
    };

    private mousemove = ({ x, y }: MouseEvent) => {
        if (this.isDrawing) {
            const point = {
                x: x - this.offsetLeft,
                y: y - this.offsetTop,
            };
            this.path.push(point);
            this.invalidate();
        }
    };

    private mouseup = () => {
        this.isDrawing = false;
        this.invalidate(true);
    };

    private invalidate(isMouseUp = false) {
        const [curves, splitAt] = fitCurve(this.path, this.maxError);
        if (isMouseUp) {
            this.dropCount += this.path.length;
            this.curves.push(...curves);
            this.path = [];
            this.activeCurve = undefined;
        } else if (curves.length > 1) {
            this.dropCount += splitAt;
            this.curves.push(...curves.splice(0, curves.length - 1));
            this.path.splice(0, splitAt);
            this.activeCurve = curves[0];
        } /* curves.length <= 1 */ else {
            this.activeCurve = curves[0];
        }
        this.forceUpdate();
    }

    private renderCurvesPathString() {
        const parts: string[] = [];
        for (let i = 0; i < this.curves.length; ++i) {
            const [
                { x, y },
                { x: c1x, y: c1y },
                { x: c2x, y: c2y },
                { x: dx, y: dy },
            ] = this.curves[i];
            if (i === 0) parts.push(`M${x} ${y}`);
            parts.push(`C${c1x} ${c1y} ${c2x} ${c2y} ${dx} ${dy}`);
        }
        return parts.join("");
    }

    private renderActivePathString() {
        if (this.activeCurve) {
            const [
                { x, y },
                { x: c1x, y: c1y },
                { x: c2x, y: c2y },
                { x: dx, y: dy },
            ] = this.activeCurve;
            return `M${x} ${y}C${c1x} ${c1y} ${c2x} ${c2y} ${dx} ${dy}`;
        }
    }

    private renderRoughPathString() {
        return this.path.map(({ x, y }, i) => (i === 0 ? `M${x} ${y}` : `L${x} ${y}`)).join("");
    }

    private renderAltPathString() {
        const path = this.path.slice();
        const t = 10;
        if (path.length > t + 1) {
            // 随机去掉一部分，再计算 fit curve
            const badguys = path.slice(1, path.length - t);
            for (let i = 0; i < 3; ++i) {
                badguys.splice(~~(Math.random() * badguys.length), 1);
            }
            path.splice(1, path.length - t, ...badguys);
        }
        const [curves] = fitCurve(path, this.maxError);
        const parts: string[] = [];
        for (let i = 0; i < curves.length; ++i) {
            const [{ x, y }, { x: c1x, y: c1y }, { x: c2x, y: c2y }, { x: dx, y: dy }] = curves[i];
            if (i === 0) parts.push(`M${x} ${y}`);
            parts.push(`C${c1x} ${c1y} ${c2x} ${c2y} ${dx} ${dy}`);
        }
        return parts.join("");
    }

    private renderPoints() {
        return this.curves.map((a, i) => {
            const { x, y } = a[3];
            return <circle key={i} cx={x} cy={y} r={3} fill="transparent" stroke="red"></circle>;
        });
    }

    public render() {
        return (
            <svg
                stroke="#000000"
                strokeWidth={2}
                strokeLinecap="round"
                fill="transparent"
                width={this.width}
                height={this.height}
            >
                <path d={this.renderCurvesPathString()}></path>
                {this._lastPathType === "alt" ? (
                    <path
                        stroke={this.showPoints ? "#0000ff" : "black"}
                        d={this.renderAltPathString()}
                    ></path>
                ) : this._lastPathType === "curve" ? (
                    <path
                        stroke={this.showPoints ? "#007fff" : "black"}
                        d={this.renderActivePathString()}
                    ></path>
                ) : (
                    <path
                        stroke={this.showPoints ? "#ff0000" : "#black"}
                        d={this.renderRoughPathString()}
                    ></path>
                )}

                {this.showPoints && this.renderPoints()}
            </svg>
        );
    }
}

export function usePencil() {
    const [, forceUpdate] = useState(0);
    return useState(() => new Pencil(() => forceUpdate((e) => ~e)))[0];
}
