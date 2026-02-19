
import "@typespec/openapi3";
import "@typespec/http";

using Http;

@pattern("</(\\{{0,1}([0-9a-fA-F]){8}-([0-9a-fA-F]){4}-([0-9a-fA-F]){4}-([0-9a-fA-F]){4}-([0-9a-fA-F]){12}\\}{0,1})[0-9a-zA-Z\\/]+>")
scalar path extends string;

@pattern("</[A-Za-z0-9.]+:[A-Za-z0-9]+>")
scalar attribute_uri extends string;

@pattern("</[A-Za-z0-9.]+")
scalar attribute_file_name extends string;

@format("uuid")
scalar uuid extends string;

model LayerStatus
{
  id: uuid;
  name: string;
  latestVersion: uuid;
}

model LayerDetails
{
  id: uuid;
  name: string;
  history: LayerVersion[]
}

model IfcxProvenanceData
{
  author: string;
  timestamp: string;
  application: string;
}

model LayerVersion
{
  layerId: uuid;
  versionId: uuid;
  previousVersionId: uuid;
  provenance: IfcxProvenanceData;
}

model LayerVersionIfcxFile
{
  blobUrl: string;
}

model CreateLayerCommand
{
  id: uuid;
  name: string;
}

model UpdateLayerCommand
{
  name: string;
}

model CreateLayerVersionCommand
{
  id: uuid;
  previousLayerVersionId: uuid;
  blobId: uuid;
}

model BlobResponse
{
  blobId: uuid;
  putURL: string;
}

enum IfcxFileDownloadType
{
  just_this_version,
  whole_layer_history_intact,
  whole_layer_history_condensed,
  whole_layer_and_imports_history_condensed
}

enum CreateLayerVersionResponseState
{
  OK,
  OUT_OF_DATE
}

model CreateLayerVersionResponse
{
  state: CreateLayerVersionResponseState;
}

@service
@route("/ifcx-api")
namespace IfcxApi {
    
  @route("/upload/{blobId}")
  @put op upload(@path blobId: uuid, @bodyRoot file: File): OkResponse;
  
  @route("/download/{blobId}")
  @put op download(@path blobId: uuid): File;
  
  @route("/layers")
  namespace Layers
  {
    @get op layers(): LayerStatus[];

    @post op createLayer(@body cmd: CreateLayerCommand): OkResponse;

    @route("/{layerId}")
    namespace LayerRoutes {
      @get op get_layer(@path layerId: uuid): LayerDetails;
      @delete op delete_layer(@path layerId: uuid): OkResponse;
      
      @route("/upload-ifcx-blob-url")
      @post op uploadIfcxBlobUrl(@path layerId: uuid): BlobResponse;

      @route("/versions")
      namespace VersionsRoutes {
        @post op createLayerVersion(@path layerId: uuid, @body version: CreateLayerVersionCommand): CreateLayerVersionResponse;

        @route("/{versionId}")
        namespace LayerVersionRoutes
        {
          @get op get_layer_version(@path layerId: uuid, @path versionId: uuid): LayerVersion;

          @route("/download-ifcx")
          @put op layer_ifcx(
            @path layerId: uuid, 
            @path versionId: uuid,
            @query downloadType: IfcxFileDownloadType
          ): LayerVersionIfcxFile;

          @route("/query")
          op query is IfcxQueryApi.query;
        }
      }
    }
  }
}

model IfcxQueryApiResponse
{

}

interface IfcxQueryApi {
  @get op query(
    @path layerId: uuid,
    @path versionId: uuid,
    @query path: string;
    @query provenance: boolean;
    @query expandChildren: boolean;
    @query expandChildrenRecursive: boolean;
  ): IfcxQueryApiResponse;
}