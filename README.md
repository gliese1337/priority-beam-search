# priority-beam-search
A generic beam search algorithm. The package exports single `{ Optimizer }` constructor


API
====

`new Optimizer<T>(extend: (c: T) => Iterable<T>, check: (c: T) => boolean, evaluate: (a: T, b: T) => number, options?: OptimizerOptions<T>)` Constructs a new optimizer; `extend` is a function which takes a partial solution and returns a (possibly empty) set of new partial solutions derived from it; `check` is a function which takes a partial solution and determines whether or not it is a complete solution; `evaluate` compares two partial or complete solutions to determine which one is most optimal. Additional options are as follow:
* `isOptimal(c: T): boolean` A function which determines whether or not a complete solution is verifiably optimal. If such a solution is found, the optimizer will terminate and return that solution, without exploring any more of the search space.
* `beamLimit: number` The maximum number of partial solutions to keep in memory. Less-promising leads will be pruned to maintain this limit. Defaults to `Infinity`.
* `turnTime: number` The maximum number of milliseconds to spend before yielding control back to the event loop. Must be positive and finite. Defaults to 30ms.
* `totalTime: number` Limits the total number of milliseconds for which the optimizer will run; if the optimizer has not terminated by this time, it will return the best solutions discovered so far. Defaults to `Infinity`.
* `maxSavedEquivalents: number` Limits the maximum number of equally-optimal solutions that will be cached during the search. Defaults to `Infinity`.
* `equivBailLimit: number` Limits the maximum number of equally-optimal solutions that can be found before the optimizer will terminate and return the current set of best solutions so far. Defaults to `Infinity`.
* `utilization: number` A number from 0 to 1 specifying what fraction of CPU time the optimizer should attempt to use. Defaults to 0.5.
* `optimalTimeRatio: number` A number from 0 to 1 specifying the expected ratio between the time to find an optimal solution and the total run time of the optimizer. If the ratio between the time required to find the most recent best solution and the total run time so far exceeds this ratio, the optimizer will terminate and return the best solutions so far. Defaults to 0 (i.e., no limit on how long the optimizer runs).

If neither `isOptimal` or `beamLimit` are provided, the optimizer will degrade to performing an exhaustive recursive backtracking search of the entire search space as defined by `extend` (modulo early termination caused by one of the other time-limiting options.) In this mode, in order to save time, the optimizer will not attempt to sort partial solutions, as it is expected that all partial solutions will be evaluated eventually. If that behavior is not desired (i.e., if you want to make use of heuristic early termination via one of the other time-limiting options, but you want to ensure that the most promising leads are investigated first to make it more likely to find the best solution before early termination is triggered), simply pass in a constant function like `(_) => false` for `isOptimal`.

Optimizer instances have only a single public method:

`run(init: Iterable<T>): Promise<[Set<T>, number]>` This takes a non-empty set of starting point partial solutions from which to begin the search, and returns a `Promise` which eventually resolves to a pair of a set of the best equally-optimal solutions found and the total active time in milliseconds spent in the search.