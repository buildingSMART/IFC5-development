using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace Application
{
    public interface IFileSystem
    {
        public Task WriteFileAsync(string path, Stream s, CancellationToken cancellationToken = default);
        public Task<Stream> ReadFileAsync(string path, CancellationToken cancellationToken = default);
        public Task<string[]> ListFilesAsync(string path, CancellationToken cancellationToken = default);
        public Task<bool> ExistsAsync(string path, CancellationToken cancellationToken = default);
        public Task DeleteAsync(string path, CancellationToken cancellationToken = default);
    }


    public class InMemoryFileSystem : IFileSystem
    {
        private readonly ConcurrentDictionary<string, byte[]> _files = new();

        public async Task WriteFileAsync(string path, Stream s, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(path))
                throw new ArgumentException("Path cannot be null or empty.", nameof(path));

            if (s == null)
                throw new ArgumentNullException(nameof(s));

            using var ms = new MemoryStream();
            await s.CopyToAsync(ms, cancellationToken);

            _files[NormalizePath(path)] = ms.ToArray();
        }

        public Task<Stream> ReadFileAsync(string path, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(path))
                throw new ArgumentException("Path cannot be null or empty.", nameof(path));

            if (!_files.TryGetValue(NormalizePath(path), out var bytes))
                throw new FileNotFoundException($"File not found: {path}");

            return Task.FromResult<Stream>(new MemoryStream(bytes, writable: false));
        }

        public Task<string[]> ListFilesAsync(string path, CancellationToken cancellationToken = default)
        {
            var prefix = NormalizeDirectoryPrefix(path);

            var result = _files.Keys
                .Where(k => k.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
                .ToArray();

            return Task.FromResult(result);
        }

        public Task<bool> ExistsAsync(string path, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(path))
                return Task.FromResult(false);

            var normalized = NormalizePath(path);

            if (_files.ContainsKey(normalized))
                return Task.FromResult(true);

            var dirPrefix = NormalizeDirectoryPrefix(path);
            return Task.FromResult(_files.Keys.Any(k => k.StartsWith(dirPrefix, StringComparison.OrdinalIgnoreCase)));
        }

        public Task DeleteAsync(string path, CancellationToken cancellationToken = default)
        {
            var normalized = NormalizePath(path);
            if (!_files.ContainsKey(normalized))
                throw new Exception($"Couldn't delete {path} it does not exist");

            _files.TryRemove(normalized, out _);
            return Task.CompletedTask;
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
    }

    public class RealFileSystem : IFileSystem
    {
        public async Task WriteFileAsync(string path, Stream s, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(path))
                throw new ArgumentException("Path cannot be null or empty.", nameof(path));

            if (s == null)
                throw new ArgumentNullException(nameof(s));

            var fullPath = Path.GetFullPath(path);

            var directory = Path.GetDirectoryName(fullPath);
            if (!string.IsNullOrEmpty(directory))
                Directory.CreateDirectory(directory);

            await using var fileStream = new FileStream(
                fullPath,
                FileMode.Create,
                FileAccess.Write,
                FileShare.None,
                bufferSize: 4096,
                useAsync: true);

            await s.CopyToAsync(fileStream, cancellationToken);
        }

        public Task<Stream> ReadFileAsync(string path, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(path))
                throw new ArgumentException("Path cannot be null or empty.", nameof(path));

            var fullPath = Path.GetFullPath(path);

            if (!File.Exists(fullPath))
                throw new FileNotFoundException($"File not found: {path}");

            Stream stream = new FileStream(
                fullPath,
                FileMode.Open,
                FileAccess.Read,
                FileShare.Read,
                bufferSize: 4096,
                useAsync: true);

            return Task.FromResult(stream);
        }

        public Task<string[]> ListFilesAsync(string path, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(path))
                return Task.FromResult(Array.Empty<string>());

            var fullPath = Path.GetFullPath(path);

            if (!Directory.Exists(fullPath))
                return Task.FromResult(Array.Empty<string>());

            return Task.FromResult(Directory.GetFiles(fullPath));
        }

        public Task<bool> ExistsAsync(string path, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(path))
                return Task.FromResult(false);

            var fullPath = Path.GetFullPath(path);

            return Task.FromResult(File.Exists(fullPath) || Directory.Exists(fullPath));
        }

        public Task DeleteAsync(string path, CancellationToken cancellationToken = default)
        {
            File.Delete(path);
            return Task.CompletedTask;
        }
    }
}
