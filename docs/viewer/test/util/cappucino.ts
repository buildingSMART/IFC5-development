
let globalPath: string[] = [];

class Test
{
    path: string;
    fn: any;

    constructor(path: string, fn: any)
    {
        this.path = path;
        this.fn = fn;
    }

    async exec()
    {
        let startMS = new Date().getTime();
        try
        {
            await this.fn();
        } catch(e)
        {
            let totalMS = new Date().getTime() - startMS;
            console.log(`\x1b[31m --- [FAIL] --- ${this.path} \x1b[33m${totalMS}ms \x1b[0m`);
            console.log(e);
            return false;
        }   
        let totalMS = new Date().getTime() - startMS;

        console.log(`\x1b[32m [OK] ${this.path} \x1b[33m${totalMS}ms \x1b[0m `);
        return true;
    }
}

let testlist: Test[] = [];

export function describe(name: string, fn: any)
{
    globalPath.push(name);
    fn();
    globalPath.pop();
}

export function it(name: string, fn: any)
{
    globalPath.push(name);
    testlist.push(new Test(globalPath.join("::"), fn));
    globalPath.pop();
}

export function nope(name: string, fn: any)
{
}

export function each(prefix: string, arr: string[], fn: any)
{
    arr.forEach((part) => {
        globalPath.push(`${prefix}: ${part}`);
        testlist.push(new Test(globalPath.join("::"), () => {fn(part)}));
        globalPath.pop();
    })
}

export async function test()
{
    let ok = true;
    for (let i = 0; i < testlist.length; i++)
    {
        ok = await testlist[i].exec() && ok;
    }

    if (!ok)
    {
        process.exit(-1);
    }
}