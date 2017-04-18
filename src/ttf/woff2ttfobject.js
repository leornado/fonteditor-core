/**
 * @file woff2格式转ttf格式
 *
 * woff2:
 * https://github.com/google/woff2
 *
 * @author mengke01(kekee000@gmail.com)
 */

define(function (require) {
    var Reader = require('./reader');
    var Writer = require('./writer');
    var error = require('./error');
    var woff2Util = require('./util/woff2');
    var supportTables = require('./table/support');
    var Woff2GlyfTable = require('./table/woff2/glyf');
    var Woff2HmtxTable = require('./table/woff2/hmtx');
    var TTFReader = require('./ttfreader');

    /**
     * woff2格式转换成ttf字体格式
     *
     * @param {ArrayBuffer} woffBuffer woff2缓冲数组
     * @param {Object} options 选项
     * @param {Object} options.decompress 解压相关函数
     *
     * @return {ArrayBuffer} ttf格式byte流
     */
    function woff22ttf(woffBuffer, options) {
        options = options || {};
        if (!options.decompress) {
            error.raise(10402);
        }

        var reader = new Reader(woffBuffer);
        var signature = reader.readUint32(0);
        var flavor = reader.readUint32(4);

        if (signature !== 0x774F4632 || flavor !== 0x10000) {
            reader.dispose();
            error.raise(10401);
        }

        var numTables = reader.readUint16(12);
        var totalCompressedSize = reader.readUint32(20);
        // var metaOffset = reader.readUint32(28);
        // var metaLength = reader.readUint32(32);
        // var metaOrigLength = reader.readUint32(36);
        // var privOffset = reader.readUint32(40);
        // var privLength = reader.readUint32(44);

        var tableEntries = {};
        var tableEntry;
        var i;
        var l;
        var srcOffset = 0;
        // 读取woff表索引信息
        reader.seek(48);
        for (i = 0; i < numTables; ++i) {
            var flagByte;
            var flags;
            var tag;
            flagByte = reader.readUint8();
            if ((flagByte & 0x3f) === 63) {
                tag = reader.readString(reader.offset, 4)
            }
            else {
                tag = woff2Util.getTableTag(flagByte & 0x3f);
            }
            var flags = 0
            var xformVersion = (flagByte >> 6) & 0x03;
            if (tag === 'glyf' || tag === 'loca') {
                if (xformVersion === 0) {
                    flags |= 256;
                }
            }
            else if (xformVersion !== 0) {
                flags |= 256;
            }

            flags |= xformVersion;

            var origLength = woff2Util.readUIntBase128(reader);
            if (origLength === false) {
                error.raise(10401);
            }
            var transformLength = origLength;
            if ((flags & 256) !== 0) {
                transformLength = woff2Util.readUIntBase128(reader);
            }

            if (transformLength < 0) {
                error.raise(10401);
            }
            tableEntry = {
                flags: flags,
                tag: tag,
                length: origLength,
                transformLength: transformLength
            };
            tableEntry.offset = srcOffset;
            srcOffset += transformLength;
            tableEntries[tableEntry.tag] = tableEntry;
        }

        var compressedBytes = reader.readBytes(reader.offset, totalCompressedSize);
        var unCompressedBytes = options.decompress(compressedBytes);

        reader = new Reader(new Uint8Array(unCompressedBytes).buffer);

        // 写头部
        var entrySelector = Math.floor(Math.log(numTables) / Math.LN2);
        var searchRange = Math.pow(2, entrySelector) * 16;
        var rangeShift = numTables * 16 - searchRange;

        var ttf = {
            version: 1,
            numTables: numTables,
            searchRange: searchRange,
            entrySelector: entrySelector,
            rangeShift: rangeShift,
            tables: tableEntries
        };

        Object.keys(supportTables).forEach(function (tag) {
            if (tag === 'glyf') {
                var tableParser = (ttf.tables.glyf.flags & 0x03) !== 0 ? supportTables[tag] : Woff2GlyfTable;
                ttf[tag] = new tableParser(ttf.tables[tag].offset).read(reader, ttf);
            }
            else if (tag === 'loca') {

            }
            else if (tag === 'hmtx') {
                var tableParser = (ttf.tables.hmtx.flags & 0x03) === 0 ? supportTables[tag] : Woff2HmtxTable;
                ttf[tag] = new tableParser(ttf.tables[tag].offset).read(reader, ttf);
            }
            else {
                if (ttf.tables[tag]) {
                    ttf[tag] = new supportTables[tag](ttf.tables[tag].offset).read(reader, ttf);
                }
            }
        });

        delete options.decompress;
        // FIXME
        // ttf.glyf = ttf.glyf || [];
        // ttf.cmap = {};
        // ttf.hmtx = [];
        return new TTFReader(options).resolve(ttf);
    }


    return woff22ttf;
});