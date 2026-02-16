// See https://aka.ms/new-console-template for more information
using examples_ifc5_mycomponent;
using ifcx_sdk;

Console.WriteLine("Hello, World!");

byte[] bytes = File.ReadAllBytes("./../../../../output.ifcx");

MemoryStream memoryStream = new MemoryStream(bytes);

var file = IfcxFile.ReadIfcxFile(memoryStream);

var comp = file.ReadComponent<Mycomponent>(Mycomponent.Identity(), 1);

Console.WriteLine(comp.FirstName);