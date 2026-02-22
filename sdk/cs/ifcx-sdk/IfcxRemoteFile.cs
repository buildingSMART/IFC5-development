using ApiSdk;
using ApiSdk.Models;
using System;
using System.Collections.Generic;
using System.IO;
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

        public async Task DeleteLayer(Guid layerId)
        {
            await this.conn.DeleteLayer(layerId);
        }

        public async Task<LayerDetails> GetLayer(Guid layerId)
        {
            return await this.conn.GetLayer(layerId);
        }

        public async Task<List<LayerStatus>> ListLayers()
        {
            return await this.conn.ListLayers();
        }

        public async Task<LayerVersion> GetLayerVersion(Guid layerId, Guid versionId)
        {
            return await this.conn.GetLayerVersion(layerId, versionId);
        }

        public async Task Upload(Guid blobId, Stream body)
        {
            await this.conn.Upload(blobId, body);
        }

        public async Task<Stream> Download(Guid blobId)
        {
            return await this.conn.Download(blobId);
        }

        public async Task<CreateLayerVersionResponse> CreateLayerVersion(Guid layerId, CreateLayerVersionCommand cmd)
        {
            return await this.conn.CreateLayerVersion(layerId, cmd);
        }
    }
}
