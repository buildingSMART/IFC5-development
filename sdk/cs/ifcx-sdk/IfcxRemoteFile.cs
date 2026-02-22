using ApiSdk;
using ApiSdk.Models;
using Optional.Collections;
using Optional.Unsafe;
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

        public enum SyncOutcome
        {
            UpToDate,
            PleaseCatchUp,
            RequestFullExport
        }

        public async Task<SyncOutcome> Sync()
        {
            var layerOpt = await this.conn.GetLayer(this.id);

            if (!layerOpt.HasValue)
            {
                // layer does not exist, lets create it
                await this.conn.CreateLayer(new CreateLayerCommand() { Id=this.id, Name = "My Layer" });

                // done
                return SyncOutcome.RequestFullExport;
            }

            var layer = layerOpt.ValueOrDefault();

            // figure out how we relate to history
            var currentVersionOpt = layer.History.FirstOrNone(h => h.VersionId == this.lastVersionId);

            if (!currentVersionOpt.HasValue)
            {
                // somehow we have gotten off track, request a full re-export so server can diff

                return SyncOutcome.RequestFullExport;
            }

            // walk back and apply
            int latestVersionAccordingToLayer = -1;
            for (int i = 0; i < layer.History.Count; i++)
            {
                if (layer.History[i].VersionId == this.lastVersionId)
                {
                    latestVersionAccordingToLayer = i;
                    break;
                }
            }

            if (latestVersionAccordingToLayer == layer.History.Count - 1)
            {
                return SyncOutcome.UpToDate;
            }

            return SyncOutcome.PleaseCatchUp;
        }

    }
}