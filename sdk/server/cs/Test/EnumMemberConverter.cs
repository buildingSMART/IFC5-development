using System;
using System.Collections.Generic;
using System.Reflection;
using System.Runtime.Serialization;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Test
{
    /// <summary>
    /// A JsonConverterFactory that creates EnumMemberConverter&lt;T&gt; instances for any enum type.
    /// Reads [EnumMember(Value = "...")] attributes to determine the wire string for each member.
    /// </summary>
    public class EnumMemberConverterFactory : JsonConverterFactory
    {
        public override bool CanConvert(Type typeToConvert) => typeToConvert.IsEnum;

        public override JsonConverter CreateConverter(Type typeToConvert, JsonSerializerOptions options) =>
            (JsonConverter)Activator.CreateInstance(
                typeof(EnumMemberConverter<>).MakeGenericType(typeToConvert))!;
    }

    /// <summary>
    /// Serializes and deserializes an enum using [EnumMember(Value = "...")] wire names.
    /// Falls back to the C# member name when no [EnumMember] attribute is present.
    /// </summary>
    public class EnumMemberConverter<T> : JsonConverter<T> where T : struct, Enum
    {
        private readonly Dictionary<T, string> _toWire = new();
        private readonly Dictionary<string, T> _fromWire = new(StringComparer.OrdinalIgnoreCase);

        public EnumMemberConverter()
        {
            foreach (var field in typeof(T).GetFields(BindingFlags.Public | BindingFlags.Static))
            {
                var value = (T)field.GetValue(null)!;
                var attr = field.GetCustomAttribute<EnumMemberAttribute>();
                var wire = attr?.Value ?? field.Name;
                _toWire[value] = wire;
                _fromWire[wire] = value;
            }
        }

        public override T Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            var str = reader.GetString();
            if (str != null && _fromWire.TryGetValue(str, out var value))
                return value;
            throw new JsonException($"Unable to convert \"{str}\" to {typeof(T).Name}.");
        }

        public override void Write(Utf8JsonWriter writer, T value, JsonSerializerOptions options) =>
            writer.WriteStringValue(_toWire.TryGetValue(value, out var wire) ? wire : value.ToString());
    }
}
