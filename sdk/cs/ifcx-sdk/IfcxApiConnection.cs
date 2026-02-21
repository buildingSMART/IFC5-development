using ApiSdk;
using Microsoft.Kiota.Abstractions.Authentication;
using Microsoft.Kiota.Http.HttpClientLibrary;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ifcx_sdk
{ 
    public interface IIfcxApiConnection
    {
        public Task CreateLayer(ApiSdk.Models.CreateLayerCommand cmd);
    }

    public class IfcxApiConnection : IIfcxApiConnection
    {
        ApiClient client;

        public IfcxApiConnection() {

            var authProvider = new AnonymousAuthenticationProvider();

            var adapter = new HttpClientRequestAdapter(authProvider);

            adapter.BaseUrl = "https://api.example.com";

            this.client = new ApiClient(adapter);
        }

        public async Task CreateLayer(ApiSdk.Models.CreateLayerCommand cmd)
        {
            var result = await this.client.IfcxApi.Layers.PostAsync(cmd);
        }
    }
}
