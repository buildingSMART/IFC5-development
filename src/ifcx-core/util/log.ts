
const LOG_ENABLED = true;

export function log(bla: any)
{
    if (LOG_ENABLED)
    {
        console.log(`${JSON.stringify(arguments)}`);
    }
}