import { Beam } from './beam';

export interface OptimizerOptions<T> {
    isOptimal?: (c: T) => boolean;
    beamLimit?: number;
    turnTime?: number;
    totalTime?: number;
    maxSavedEquivalents?: number;
    equivBailLimit?: number;
    utilization?: number;
    optimalTimeRatio?: number;
}

interface SequentialAccess<T> {
    readonly length: number;
    push(...e: T[]): void;
    pop() : T | undefined;
    [0]: T | undefined;
}

export class Optimizer<T> {

    private isOptimal: ((c: T) => boolean) | undefined;
    private beamLimit: number;
    private turnTime: number;
    private totalTime: number;
    private maxSavedEquivalents: number;
    private equivBailLimit: number;
    private turnInterval: number;
    private optimalTimeRatio: number;

    constructor(
        private extend: (c: T) => Iterable<T>,
        private check: (c: T) => boolean,
        private evaluate: (a: T, b: T) => number,
        options: OptimizerOptions<T> = {},
    ) {
        if (typeof options.isOptimal === "function") {
            this.isOptimal = options.isOptimal;
        }

        const beamLimit = Number(options.beamLimit);
        this.beamLimit = beamLimit > 0 ? beamLimit : Infinity;

        // default to 30ms turns to avoid Chrome warnings for long-running tasks (50+ms)
        const optTurnTime = Number(options.turnTime);
        this.turnTime = optTurnTime > 0 && isFinite(optTurnTime) ? optTurnTime : 30;

        const optTotalTime = Number(options.totalTime);
        this.totalTime = optTotalTime > 0 ? optTotalTime : Infinity;

        this.maxSavedEquivalents = options.maxSavedEquivalents || 0;
        this.equivBailLimit = typeof options.equivBailLimit === "number" ? options.equivBailLimit : Infinity;

        const utilization = Math.min(Math.abs(options.utilization || 0.5), 1);
        this.turnInterval = this.turnTime / utilization;

        const optimalTimeRatio = Number(options.optimalTimeRatio);
        this.optimalTimeRatio = optimalTimeRatio >= 0 && optimalTimeRatio <= 1 ? optimalTimeRatio : 0.66;
    }

    public run(init: Iterable<T>): Promise<[Set<T>, number]> {
        return new Promise((resolve) => {
            const {
                extend, check, evaluate, isOptimal,
                totalTime, turnTime, turnInterval,
                maxSavedEquivalents, equivBailLimit
            } = this;

            const partials: SequentialAccess<T> = isOptimal || isFinite(this.beamLimit) ?
                new Beam(evaluate, this.beamLimit, init) : [...init] as any;

            if (partials.length === 0) throw new Error("Missing Initial States");

            let representativeBest = partials[0] as T;

            const equivalents: Set<T> = new Set();

            let activeTime = 0;
            let equivSize = 0;

            let nextLoopTime = Date.now();

            let hasTop = false;
            let top: T | undefined;

            let optimalTime = totalTime;
            let bestTime = 0;

            const loop = (interval: number) => {
                const start = Date.now();
                if (start < nextLoopTime) {
                    return;
                }

                nextLoopTime += Math.ceil((start - nextLoopTime) / turnInterval) * turnInterval;

                const limit = start + turnTime;

                iter: do {
                    if (hasTop) {
                        for (const c of extend(top as T)) {
                            partials.push(c);
                        }

                        hasTop = false;
                    }

                    while (partials.length > 0) {

                        const now = Date.now();
                        if (now > limit) {
                            activeTime += now - start;
                            if (activeTime >= totalTime || activeTime >= optimalTime) {
                                console.log("Terminating optimization due to time limits.");
                                break iter;
                            }

                            return;
                        }

                        const candidate = partials.pop() as T;

                        if (!check(candidate)) {
                            top = candidate;
                            hasTop = true;
                            continue iter;
                        }

                        const cmp = evaluate(candidate, representativeBest);
                        if (cmp < 0) {
                            equivalents.clear();
                            equivalents.add(candidate);
                            bestTime = activeTime;
                            if (isOptimal && isOptimal(candidate)) {
                                console.log("Found optimal solution early.");
                                break iter;
                            }

                            if (this.optimalTimeRatio) {
                                optimalTime = activeTime * (2 - this.optimalTimeRatio);
                            }

                            representativeBest = candidate;
                        } else if (cmp === 0 && equivSize < maxSavedEquivalents) {
                            equivalents.add(candidate);
                            equivSize++;
                            if (equivSize > equivBailLimit) {
                                console.log("Terminating optimization based on solution count.");
                                break iter;
                            }
                        }
                    }

                    console.log("Exhausted search space.")
                    break;

                } while (true);

                console.log(`Total Search Time: ${activeTime}. Found best solution by ${bestTime}.`);

                clearInterval(interval);
                resolve([equivalents, activeTime]);
            };

            const interval: number = setInterval(() => loop(interval), turnInterval);
            loop(interval);
        });
    }
}