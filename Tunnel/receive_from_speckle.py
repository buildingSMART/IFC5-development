from specklepy.api.client import SpeckleClient
from specklepy.core.api import operations
from specklepy.transports.server import ServerTransport

weka_hills_speckle_project_id = "7a489ac0d4"

speckle_client = SpeckleClient(host="app.speckle.systems")
transport = ServerTransport(
    stream_id=weka_hills_speckle_project_id, client=speckle_client
)

weka_hills_speckle_models = speckle_client.model.get_models(
    project_id=weka_hills_speckle_project_id
)

speckle_models_w_versions = {}
for model in weka_hills_speckle_models.items:
    speckle_model = speckle_client.model.get_with_versions(
        model_id=model.id,
        project_id=weka_hills_speckle_project_id,
    )
    if "geo/geology-model" in model.name:
        geological_unit = str(model.name).replace("geo/geology-model/", "")
        speckle_models_w_versions[geological_unit] = speckle_model
        print(f"{geological_unit}: {model.id}")
    elif "tunnel" in model.name:
        tunnel_model = str(model.name).replace("tunnel/", "")
        speckle_models_w_versions[tunnel_model] = speckle_model
        print(f"{tunnel_model}: {model.id}")

model_data = operations.receive(
    # speckle_models_w_versions["alluvium"].versions.items[0].referencedObject,
    # speckle_models_w_versions["alignment"].versions.items[0].referencedObject,
    speckle_models_w_versions["excavation"].versions.items[0].referencedObject,
    transport,
)
