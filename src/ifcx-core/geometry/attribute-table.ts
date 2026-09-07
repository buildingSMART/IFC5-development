// NDJSON attribute table: one JSON object per line, accessed by line index

export class AttributeTable {
    private lines: string[];
    public readonly filename: string;

    constructor(filename: string, ndjsonContent: string) {
        this.filename = filename;
        // Split by newline, filter out empty trailing lines
        this.lines = ndjsonContent.split("\n").filter((line, i, arr) => {
            return line.length > 0 || i < arr.length - 1;
        });
    }

    get length(): number {
        return this.lines.length;
    }

    readRaw(index: number): string {
        if (index < 0 || index >= this.lines.length) {
            throw new Error(`Component index ${index} out of range [0, ${this.lines.length}) in table "${this.filename}"`);
        }
        return this.lines[index];
    }

    read<T>(index: number): T {
        return JSON.parse(this.readRaw(index)) as T;
    }

    static fromEntries(filename: string, entries: unknown[]): AttributeTable {
        const ndjson = entries.map(e => JSON.stringify(e)).join("\n");
        return new AttributeTable(filename, ndjson);
    }

    toNDJSON(): string {
        return this.lines.join("\n");
    }
}
