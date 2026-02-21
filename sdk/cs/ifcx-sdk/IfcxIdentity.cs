using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ifcx_sdk
{
    public record IfcxIdentity<T>
    {
        public string typeID { get; init; }
        public string originSchemaSrc { get; init; }
        public Func<string, T> fromJSONString { get; init; }
        public Func<T, string> toJSONString { get; init; }
    }
}
