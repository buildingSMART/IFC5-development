// https://pypi.org/project/toposort/
export default function toposort(data) {
    /**
     * Dependencies are expressed as a dictionary whose keys are items
     * and whose values are a set of dependent items. Output is a list of
     * sets in topological order. The first set consists of items with no
     * dependencies, each subsequent set consists of items that depend upon
     * items in the preceding sets.
     */

    const result = [];

    // Special case empty input.
    if (Object.keys(data).length === 0) {
        return result;
    }

    // Copy the input to avoid modifying it.
    // Discard self-dependencies and copy two levels deep.
    data = Object.fromEntries(
        Object.entries(data).map(([item, dep]) => [
            item,
            new Set([...dep].filter((e) => e !== item)),
        ])
    );

    // Find all items that don't depend on anything.
    const extraItemsInDeps = new Set(
        [...Object.values(data).map(st => Array.from(st)).flat()].filter((value) => !data.hasOwnProperty(value))
    );

    // Add empty dependencies where needed.
    extraItemsInDeps.forEach((item) => {
        data[item] = new Set();
    });

    while (true) {
        const ordered = new Set(
            Object.entries(data).filter(([_, dep]) => dep.size === 0).map(([k, v]) => k)
        );

        if (ordered.size === 0) {
            break;
        }

        result.push(...ordered);

        data = Object.fromEntries(
            Object.entries(data)
            .filter(([item]) => !ordered.has(item))
            .map(([item, dep]) => [item, new Set([...dep].filter((d) => !ordered.has(d)))])
        );
    }

    if (Object.keys(data).length !== 0) {
        throw new Error("CircularDependencyError: " + JSON.stringify(data));
    }

    return result;
}
