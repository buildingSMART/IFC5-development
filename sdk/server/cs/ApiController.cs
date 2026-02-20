using IfcxApi.Server.Controllers;
using IfcxApi.Server.Models;
using Microsoft.AspNetCore.Mvc;
using System;
using System.ComponentModel.DataAnnotations;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

namespace Application
{
    public class ApiController : DefaultApiController
    {
        static LayerService layerService = new LayerService(new InMemoryFileSystem(), "::in_mem");


        public override async Task<IActionResult> LayerRoutesDeleteLayer([FromRoute(Name = "layerId"), Required] Guid layerId)
        {
            await layerService.DeleteLayerAsync(layerId);
            return Ok();
        }

        public override async Task<IActionResult> LayerRoutesGetLayer([FromRoute(Name = "layerId"), Required] Guid layerId)
        {
            var layer = await layerService.GetLayerAsync(layerId);

            LayerDetails layerDetails = new LayerDetails();
            layerDetails.Id = layerId;
            layerDetails.Name = layer.name;
            layerDetails.History = layer.versions.Select(v =>
            {
                var prov = new LayerVersion();
                prov.LayerId = v.layerId;
                prov.VersionId = v.id;
                prov.PreviousVersionId = v.previousVersionId;
                prov.Provenance = new();
                prov.Provenance.Author = v.provenance.author;
                prov.Provenance.Timestamp = v.provenance.timestamp;
                prov.Provenance.Application = v.provenance.application;

                prov.Provenance.Author = v.provenance.author;

                return prov;
            }).ToList();

            return Ok(layerDetails);
        }


        public override Task<IActionResult> LayerRoutesUploadIfcxBlobUrl([FromRoute(Name = "layerId"), Required] Guid layerId)
        {
            throw new NotImplementedException();
        }

        public override async Task<IActionResult> LayersCreateLayer([FromBody] CreateLayerCommand createLayerCommand)
        {
            await layerService.CreateLayerAsync(createLayerCommand.Name, createLayerCommand.Id);
            return Ok();
        }

        public override async Task<IActionResult> LayersLayers()
        {
            var layers = await layerService.ListLayersAsync();

            var response = layers.Select(layer =>
            {
                var s = new LayerStatus();
                s.LatestVersion = layer.versions.Count == 0 ? Guid.Empty : layer.versions.Last().id;
                s.Name = layer.name;
                s.Id = layer.id;
                return s;
            });

            return Ok(response);
        }

        public override async Task<IActionResult> LayerVersionRoutesGetLayerVersion([FromRoute(Name = "layerId"), Required] Guid layerId, [FromRoute(Name = "versionId"), Required] Guid versionId)
        {
            var layer = await layerService.GetLayerAsync(layerId);
            var v = layer.versions.FirstOrDefault(x => x.id == versionId);
            if (v == null)
                return NotFound();

            var result = new LayerVersion();
            result.LayerId = v.layerId;
            result.VersionId = v.id;
            result.PreviousVersionId = v.previousVersionId;
            result.Provenance = new();
            result.Provenance.Author = v.provenance.author;
            result.Provenance.Timestamp = v.provenance.timestamp;
            result.Provenance.Application = v.provenance.application;

            return Ok(result);
        }

        public override Task<IActionResult> LayerVersionRoutesLayerIfcx([FromRoute(Name = "layerId"), Required] Guid layerId, [FromRoute(Name = "versionId"), Required] Guid versionId, [FromQuery(Name = "downloadType"), Required] IfcxFileDownloadType downloadType)
        {
            throw new NotImplementedException();
        }

        public override Task<IActionResult> LayerVersionRoutesQuery([FromRoute(Name = "layerId"), Required] Guid layerId, [FromRoute(Name = "versionId"), Required] Guid versionId, [FromQuery(Name = "path"), Required] string path, [FromQuery(Name = "provenance"), Required] bool provenance, [FromQuery(Name = "expandChildren"), Required] bool expandChildren, [FromQuery(Name = "expandChildrenRecursive"), Required] bool expandChildrenRecursive)
        {
            throw new NotImplementedException();
        }

        public override async Task<IActionResult> Upload([FromRoute(Name = "blobId"), Required] Guid blobId, [FromBody] Stream body)
        {
            await layerService.UploadFileAsync(blobId, body);
            return Ok();
        }

        public override async Task<IActionResult> Download([FromRoute(Name = "blobId"), Required] Guid blobId)
        {
            var stream = await layerService.DownloadFileAsync(blobId);
            return File(stream, "application/octet-stream");
        }

        public override async Task<IActionResult> VersionsRoutesCreateLayerVersion([FromRoute(Name = "layerId"), Required] Guid layerId, [FromBody] CreateLayerVersionCommand createLayerVersionCommand)
        {
            var result = await layerService.CreateLayerVersionAsync(layerId, createLayerVersionCommand.Id, createLayerVersionCommand.PreviousLayerVersionId, createLayerVersionCommand.BlobId);

            var response = new CreateLayerVersionResponse();
            response.State = result == LayerService.CreateLayerVersionResponse.OUT_OF_DATE ? CreateLayerVersionResponseState.OUTOFDATEEnum : CreateLayerVersionResponseState.OKEnum;

            return Ok(response);
        }
    }
}
