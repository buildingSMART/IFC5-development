
export function GetHead(path: string)
{
    return path.split("/")[0];
}

export function GetTail(path: string)
{
    let parts = path.split("/");
    parts.shift();
    return parts.join("/");
}