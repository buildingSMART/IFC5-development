import { PreCompositionNode } from "../composition/node";
import { IfcxSchema, IfcxValueDescription } from "./schema-helper";

export class SchemaValidationError extends Error
{

}

function ValidateAttributeValue(desc: IfcxValueDescription, value: any, path: string, schemas: {[key: string]: IfcxSchema})
{
    if (desc.optional && value === undefined)
    {
        // we're good
        return;
    }

    if (desc.inherits)
    {
        desc.inherits.forEach((inheritedSchemaID) => {
            let inheritedSchema = schemas[inheritedSchemaID];
            if (!inheritedSchema)
            {
                throw new SchemaValidationError(`Unknown inherited schema id "${desc.inherits}"`);
            }
            ValidateAttributeValue(inheritedSchema.value, value, path, schemas);
        });
    }

    if (desc.dataType === "Boolean")
    {
        if (typeof value !== "boolean")
        {
            throw new SchemaValidationError(`Expected "${value}" to be of type boolean`);
        }
    }
    else if (desc.dataType === "String")
    {
        if (typeof value !== "string")
        {
            throw new SchemaValidationError(`Expected "${value}" to be of type string`);
        }
    }
    else if (desc.dataType === "DateTime")
    {
        if (typeof value !== "string")
        {
            throw new SchemaValidationError(`Expected "${value}" to be of type date`);
        }
    }
    else if (desc.dataType === "Enum")
    {
        if (typeof value !== "string")
        {
            throw new SchemaValidationError(`Expected "${value}" to be of type string`);
        }
        let found = desc.enumRestrictions!.options.filter(option => option === value).length === 1;
        if (!found)
        {
            throw new SchemaValidationError(`Expected "${value}" to be one of [${desc.enumRestrictions!.options.join(",")}]`);
        }
    }
    else if (desc.dataType === "Integer")
    {
        if (typeof value !== "number")
        {
            throw new SchemaValidationError(`Expected "${value}" to be of type int`);
        }
    }
    else if (desc.dataType === "Real")
    {
        if (typeof value !== "number")
        {
            throw new SchemaValidationError(`Expected "${value}" to be of type real`);
        }
    }
    else if (desc.dataType === "Reference")
    {
        if (typeof value !== "string")
        {
            throw new SchemaValidationError(`Expected "${value}" to be of type string`);
        }
    }
    else if (desc.dataType === "Object")
    {
        if (typeof value !== "object")
        {
            throw new SchemaValidationError(`Expected "${value}" to be of type object`);
        }
        if (desc.objectRestrictions)
        {
            Object.keys(desc.objectRestrictions!.values).forEach(key => {
                let optional = desc.objectRestrictions!.values[key].optional;
                let hasOwn = Object.hasOwn(value, key);
                if (optional && !hasOwn) return; // missing, but optional

                if (!hasOwn)
                {
                    throw new SchemaValidationError(`Expected "${value}" to have key ${key}`);
                }
                ValidateAttributeValue(desc.objectRestrictions!.values[key], value[key], path + "." + key, schemas);
            })
        }
    }
    else if (desc.dataType === "Array")
    {
        if (!Array.isArray(value))
        {
            throw new SchemaValidationError(`Expected "${value}" to be of type array`);
        }
        value.forEach((entry) => {
            ValidateAttributeValue(desc.arrayRestrictions!.value, entry, path + ".<array>.", schemas);
        })
    }
    else
    {
        throw new SchemaValidationError(`Unexpected datatype ${desc.dataType}`);
    }
}

// TODO: validate the schemas themselves
export function Validate(schemas: {[key: string]: IfcxSchema}, inputNodes: Map<string, PreCompositionNode>)
{
    inputNodes.forEach((node) => {
        Object.keys(node.attributes).filter(v => !v.startsWith('__internal')).forEach((schemaID) => {
            if (!schemas[schemaID])
            {
                throw new SchemaValidationError(`Missing schema "${schemaID}" referenced by ["${node.path}"].attributes`);   
            }
            let schema = schemas[schemaID];
            let value = node.attributes[schemaID];
            
            try
            {
                ValidateAttributeValue(schema.value, value, "", schemas);
            } 
            catch(e)
            {
                if (e instanceof SchemaValidationError)
                {
                    throw new SchemaValidationError(`Error validating ["${node.path}"].attributes["${schemaID}"]: ${e.message}`);
                }
                else
                {
                    throw e;
                }
            }
        });
    })
}