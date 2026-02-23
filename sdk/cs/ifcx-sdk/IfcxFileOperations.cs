using Optional;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ifcx_sdk
{
    public class IfcxFileOperations
    {
        public static IfcxFile Diff(IfcxFile oldFile, IfcxFile newFile)
        {
            return new IfcxFile();
        }

        public static IfcxFile Federate(IfcxFile oldFile, IfcxFile newFile, bool keepHistory)
        {
            IfcxFile returnValue = new();

            // meta
            returnValue.index.Header = newFile.index.Header;
            returnValue.index.Imports = newFile.index.Imports;
            returnValue.index.AttributeTables = oldFile.index.AttributeTables.Concat(newFile.index.AttributeTables).ToArray();
            returnValue.index.AttributeTables.DistinctBy(at => at.Filename); // TODO: fix

            // sections
            if (keepHistory)
            {
                /*
                 * TODO: looks like the sections are getting annoying
                 * 
                 * probably good to split the provenance from the node data,
                 * and reference provenance by version ID per node
                 * 
                 * Added benefit is that the version data is completely inside the file
                 * the api no longer has to deal with the version info, 
                 * and uploads can contain multiple versions,
                 * which is an upside
                 * 
                 * Downside is that we lose idiomatic json sections
                 */
               foreach (var sec in oldFile.index.Sections)
                {
                    foreach (var node in sec.Nodes)
                    {

                    }
                }
            }
            else
            {

            }

            // components
            if (keepHistory)
            {
                foreach (var kv in oldFile.serializedComponents)
                {
                    returnValue.AddComponent();
                }
            }
            else
            {

            }

            return new IfcxFile();
        }

        public static Option<string> ValidateComponentsWithSchemas(IfcxFile ifcx)
        {
            return Option.None<string>();
        }
    }
}
