import { select } from 'floyd-rivest';

enum CMP {
    LT = -1,
    EQ = 0,
    GT = 1,
}

function isMinLevel(i: number): boolean {
    return (Math.log2(i + 1) & 1) === 0;
}

export class Beam<T> {

    private heap: T[] = [];

    private size = 0;

    private compare: (a: T, b: T) => CMP;

    public constructor(
        compare: (a: T, b: T) => number,
        private limit: number,
        elements: Iterable<T>,
    ) {
        this.compare = (a, b) => Math.sign(compare(a, b));

        const items = [...elements];
        const { length } = items;
        if (length > limit) {
            select(items, limit, this.compare);
            this.heap = items.slice(0, limit);
            this.size = limit;
        } else {
            this.heap = items;
            this.size = length;
        }
    
        for (let i = this.size >> 1; i >= 0; i--) {
            this.trickleDown(i);
        }
    }

    private trickleDown(i: number) {
        const { heap, compare } = this;
        const [LT, GT] = isMinLevel(i) ? [CMP.LT, CMP.GT] : [CMP.GT, CMP.LT];

        while (true) {
            const { has, m, isgc } = this.getSmallestDescendent(i, GT);
            if (!has) break;

            const hm = heap[m];
            const hi = heap[i];
            if (compare(hm, hi) === LT) {
                heap[i] = hm;
                heap[m] = hi;

                if(isgc) {
                    const p = (m - 1) >> 1;
                    const hp = heap[p];
                    if (compare(hi, hp) === GT) {
                        heap[p] = hi;
                        heap[m] = hp;
                    }
                    i = m;
                    continue;
                }
            }

            break;
        }
    }

    private getSmallestDescendent(i: number, GT: CMP) {
        const { heap, size, compare } = this;
        
        const l = (i << 1) + 1;
        if (l >= size) return { has: false, isgc: false, m: l };

        const r = l + 1;
        if (r >= size) return { has: true, isgc: false, m: l };
        
        const { has: hasl, m: lc } = this.getSmallestChild(l, GT);
        if (!hasl) {
            return {
                has: true,
                isgc: false,
                m: compare(heap[l], heap[r]) === GT ? r : l,
            };     
        }

        const { has: hasr, m: rc } = this.getSmallestChild(r, GT);
        if (!hasr) return { has: true, isgc: true, m: lc };

        return {
            has: true,
            isgc: true,
            m: compare(heap[lc], heap[rc]) === GT ? rc : lc,
        };    

    }

    private getSmallestChild(i: number, GT: CMP) {
        const { size, heap, compare } = this;
        
        const l = (i << 1) + 1;
        if (l >= size) return { has: false, m: l };

        const r = l + 1;
        if (r >= size) return { has: true, m: l };

        return {
            has: true, 
            m: compare(heap[l], heap[r]) === GT ? r : l,
        }; 
    }

    private bubbleUp(i: number) { // i is always > 0
        const { heap, compare } = this;
        const p = (i - 1) >> 1;
        const hi = heap[i];
        const hp = heap[p];
        const cmp = compare(hi, hp);

        let LT = CMP.LT;
        if (isMinLevel(i)) {
            if (cmp === CMP.GT) {
                heap[i] = hp;
                heap[p] = hi;
                i = p;
                LT = CMP.GT;
            }
        } else if (cmp === CMP.LT) {
            heap[i] = hp;
            heap[p] = hi;
            i = p;
        } else {
            LT = CMP.GT;
        }
        
        while (true) {
            if (i < 3) break;
            const gp = (((i - 1) >> 1) - 1) >> 1;

            const hi = heap[i];
            const hp = heap[gp];
            if (compare(hi, hp) === LT) {
                heap[i] = hp;
                heap[gp] = hi;
                i = gp;
            } else break;
        }
    }

    public get [0](): T | undefined {
        return this.size > 0 ? this.heap[0] : undefined;
    }

    public get length() {
        return this.size;
    }

    private maxIndex() {
        if (this.size < 2) return 0;
        if (this.size === 2) return 1;

        const { heap } = this;
        
        return this.compare(heap[1], heap[2]) === CMP.LT ? 2 : 1;
    }

    public push(e: T) {
        if (this.limit === 0) return;

        const { heap, compare } = this;

        if (this.size === 0) {
            heap[0] = e;
            this.size = 1;
        } else if (this.size < this.limit) {
            const index = this.size++;
            this.heap[index] = e;
            this.bubbleUp(index);
        } else if (this.limit === 1) {
            if (compare(e, heap[0]) === CMP.LT) {
                heap[0] = e;
            }
        } else {
            const maxI = this.maxIndex();
            if (compare(e, heap[maxI]) === CMP.LT) {
                heap[maxI] = e;
                this.trickleDown(maxI);
                this.trickleDown(0);
            }
        }
    }

    public pop(): T | undefined {
        if (this.size === 0) return undefined;
        this.size--;
        const { size, heap } = this;
        const ret = heap[0];
        if (size > 0) {
            heap[0] = heap[size];
            heap.length = size;
            this.trickleDown(0);
        } else {
            heap.length = 0;
        }

        return ret;
    }
}
