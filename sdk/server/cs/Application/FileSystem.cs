using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Application
{
    public interface IFileSystem
    {
        public void WriteFile(string path, Stream s);
        public Stream ReadFile(string path);

        public string[] ListFiles(string path);

        public bool Exists(string path);

        public void Delete(string path);
    }


    public class InMemoryFileSystem : IFileSystem
    {
        private readonly ConcurrentDictionary<string, byte[]> _files = new();

        public void WriteFile(string path, Stream s)
        {
            if (string.IsNullOrWhiteSpace(path))
                throw new ArgumentException("Path cannot be null or empty.", nameof(path));

            if (s == null)
                throw new ArgumentNullException(nameof(s));

            using var ms = new MemoryStream();
            s.CopyTo(ms);

            _files[NormalizePath(path)] = ms.ToArray();
        }

        public Stream ReadFile(string path)
        {
            if (string.IsNullOrWhiteSpace(path))
                throw new ArgumentException("Path cannot be null or empty.", nameof(path));

            if (!_files.TryGetValue(NormalizePath(path), out var bytes))
                throw new FileNotFoundException($"File not found: {path}");

            // Always return a new stream instance
            return new MemoryStream(bytes, writable: false);
        }

        public string[] ListFiles(string path)
        {
            var prefix = NormalizeDirectoryPrefix(path);

            return _files.Keys
                .Where(k => k.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
                .ToArray();
        }

        public bool Exists(string path)
        {
            if (string.IsNullOrWhiteSpace(path))
                return false;

            var normalized = NormalizePath(path);

            // Exact file match
            if (_files.ContainsKey(normalized))
                return true;

            // Virtual directory match
            var dirPrefix = NormalizeDirectoryPrefix(path);
            return _files.Keys.Any(k => k.StartsWith(dirPrefix, StringComparison.OrdinalIgnoreCase));
        }

        private static string NormalizePath(string path)
        {
            return path.Replace("\\", "/");
        }

        private static string NormalizeDirectoryPrefix(string path)
        {
            if (string.IsNullOrWhiteSpace(path))
                return string.Empty;

            var normalized = NormalizePath(path);

            return normalized.EndsWith("/")
                ? normalized
                : normalized + "/";
        }

        public void Delete(string path)
        {
            if (!this.Exists(path))
            {
                throw new Exception($"Couldn't delete {path} it does not exist");
            }
            this._files.TryRemove(path, value: out byte[] bla);
        }
    }

    public class RealFileSystem : IFileSystem
    {
        public void WriteFile(string path, Stream s)
        {
            if (string.IsNullOrWhiteSpace(path))
                throw new ArgumentException("Path cannot be null or empty.", nameof(path));

            if (s == null)
                throw new ArgumentNullException(nameof(s));

            var fullPath = Path.GetFullPath(path);

            // Ensure directory exists
            var directory = Path.GetDirectoryName(fullPath);
            if (!string.IsNullOrEmpty(directory))
            {
                Directory.CreateDirectory(directory);
            }

            // Write file (overwrite if exists)
            using var fileStream = new FileStream(
                fullPath,
                FileMode.Create,
                FileAccess.Write,
                FileShare.None);

            s.CopyTo(fileStream);
        }

        public Stream ReadFile(string path)
        {
            if (string.IsNullOrWhiteSpace(path))
                throw new ArgumentException("Path cannot be null or empty.", nameof(path));

            var fullPath = Path.GetFullPath(path);

            if (!File.Exists(fullPath))
                throw new FileNotFoundException($"File not found: {path}");

            return new FileStream(
                fullPath,
                FileMode.Open,
                FileAccess.Read,
                FileShare.Read);
        }

        public string[] ListFiles(string path)
        {
            if (string.IsNullOrWhiteSpace(path))
                return Array.Empty<string>();

            var fullPath = Path.GetFullPath(path);

            if (!Directory.Exists(fullPath))
                return Array.Empty<string>();

            return Directory.GetFiles(fullPath);
        }

        public bool Exists(string path)
        {
            if (string.IsNullOrWhiteSpace(path))
                return false;

            var fullPath = Path.GetFullPath(path);

            return File.Exists(fullPath) || Directory.Exists(fullPath);
        }

        public void Delete(string path)
        {
            File.Delete(path);
        }
    }

}
