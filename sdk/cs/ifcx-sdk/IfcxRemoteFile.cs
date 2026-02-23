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
        Guid lastVersionId;

        public IfcxRemoteFile(IIfcxApiConnection conn, Guid id, Guid lastVersionId)
        {
            this.conn = conn;
            this.id = id;
            this.lastVersionId = lastVersionId;
        }

        public enum SyncState
        {
            UpToDate,
            PleaseCatchUp,
            RequestFullExport
        }

        public record SyncResult(SyncState state, List<Guid> versionsBehind);

        public async Task<SyncResult> Sync()
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
            var currentVersionOpt = layer.History.FirstOrNone(h => h.VersionId == this.lastVersionId);

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
                if (layer.History[i].VersionId == this.lastVersionId)
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

        public async Task<IfcxFile> GetVersion(Guid version)
        {
            Guid blobId = Guid.Empty;
            var versionDiffBlob = this.conn.Download(blobId);
            var diffIfcxFile = IfcxFile.ReadIfcxFile(versionDiffBlob);
        }   

    }
}