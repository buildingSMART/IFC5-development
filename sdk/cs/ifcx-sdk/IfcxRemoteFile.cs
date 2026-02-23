using ApiSdk;
using ApiSdk.Models;
using Optional.Collections;
using Optional.Unsafe;
using QuickType;
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
        Guid id;

        public IfcxRemoteFile(IIfcxApiConnection conn, Guid id)
        {
            this.conn = conn;
            this.id = id;
        }

        public enum SyncState
        {
            UpToDate,
            PleaseCatchUp,
            RequestFullExport
        }

        public record SyncResult(SyncState state, List<Guid> versionsBehind);

        public async Task<SyncResult> Sync(Guid currentVersionId)
        {
            var layerOpt = await this.conn.GetLayer(this.id);

            if (!layerOpt.HasValue)
            {
                // layer does not exist, lets create it
                await this.conn.CreateLayer(new CreateLayerCommand() { Id=this.id, Name = "My Layer" });

                // done
                return new SyncResult(SyncState.RequestFullExport, new());
            }

            var layer = layerOpt.ValueOrDefault();

            // figure out how we relate to history
            var currentVersionOpt = layer.History.FirstOrNone(h => h.VersionId == currentVersionId);

            if (!currentVersionOpt.HasValue)
            {
                // somehow we have gotten off track, request a full re-export so server can diff

                return new SyncResult(SyncState.RequestFullExport, new());
            }

            // walk back and apply
            int latestVersionAccordingToLayer = -1;
            List<Guid> catchUp = new List<Guid>();
            for (int i = 0; i < layer.History.Count; i++)
            {
                if (layer.History[i].VersionId == currentVersionId)
                {
                    latestVersionAccordingToLayer = i;
                }
                if (i > latestVersionAccordingToLayer)
                {
                    catchUp.Append(layer.History[i].VersionId.Value);
                }
            }

            if (catchUp.Count == 0)
            {
                return new SyncResult(SyncState.UpToDate, new());
            }

            return new SyncResult(SyncState.RequestFullExport, catchUp);
        }

        public static async Task<MemoryStream> ToMemoryStreamAsync(Stream input)
        {
            var memory = new MemoryStream();
            await input.CopyToAsync(memory);
            memory.Position = 0; // rewind
            return memory;
        }

        public async Task<IfcxFile> GetVersionDiff(Guid version)
        {
            Guid blobId = Guid.Empty;
            var versionDiffBlob = await this.conn.Download(blobId);
            return IfcxFile.ReadIfcxFile(await ToMemoryStreamAsync(versionDiffBlob));
        }

        public enum CreateVersionResponse
        {
            OK,
            OUT_OF_DATE
        }

        public async Task<CreateVersionResponse> CreateNextVersion(Guid currentVersionId, IfcxFile file)
        {
            var blob = IfcxFile.WriteIfcxFile(file);
            Guid blobId = Guid.NewGuid();
            await this.conn.Upload(blobId, new MemoryStream(blob));

            var cmd = new CreateLayerVersionCommand();
            cmd.PreviousLayerVersionId = currentVersionId;
            cmd.BlobId = blobId;
            cmd.Id = Guid.NewGuid();

            var response = await this.conn.CreateLayerVersion(this.id, cmd);

            if (response.State == CreateLayerVersionResponseState.OUT_OF_DATE)
            {
                return CreateVersionResponse.OUT_OF_DATE;
            }

            return CreateVersionResponse.OK;
        }

    }
}