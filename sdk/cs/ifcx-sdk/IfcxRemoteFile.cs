using ApiSdk;
using ApiSdk.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ifcx_sdk
{
    public class IfcxRemoteFile
    {
        IIfcxApiConnection conn;

        public IfcxRemoteFile(IIfcxApiConnection conn)
        {
            this.conn = conn;
        }

        public async Task CreateLayer(string name, Guid guid)
        {
            var cmd = new CreateLayerCommand();
            cmd.Name = name;
            cmd.Id = guid;
            await this.conn.CreateLayer(cmd);
        }
    }
}
