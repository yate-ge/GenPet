#!/usr/bin/env node
import { createRequire as __genpetCreateRequire } from 'node:module'; const require = __genpetCreateRequire(import.meta.url);
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __commonJS = (cb, mod) => function __require2() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key2 of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key2) && key2 !== except)
        __defProp(to, key2, { get: () => from[key2], enumerable: !(desc = __getOwnPropDesc(from, key2)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target2) => (target2 = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target2, "default", { value: mod, enumerable: true }) : target2,
  mod
));

// node_modules/pngjs/lib/chunkstream.js
var require_chunkstream = __commonJS({
  "node_modules/pngjs/lib/chunkstream.js"(exports, module) {
    "use strict";
    var util = __require("util");
    var Stream = __require("stream");
    var ChunkStream = module.exports = function() {
      Stream.call(this);
      this._buffers = [];
      this._buffered = 0;
      this._reads = [];
      this._paused = false;
      this._encoding = "utf8";
      this.writable = true;
    };
    util.inherits(ChunkStream, Stream);
    ChunkStream.prototype.read = function(length, callback) {
      this._reads.push({
        length: Math.abs(length),
        // if length < 0 then at most this length
        allowLess: length < 0,
        func: callback
      });
      process.nextTick(
        function() {
          this._process();
          if (this._paused && this._reads && this._reads.length > 0) {
            this._paused = false;
            this.emit("drain");
          }
        }.bind(this)
      );
    };
    ChunkStream.prototype.write = function(data, encoding) {
      if (!this.writable) {
        this.emit("error", new Error("Stream not writable"));
        return false;
      }
      let dataBuffer;
      if (Buffer.isBuffer(data)) {
        dataBuffer = data;
      } else {
        dataBuffer = Buffer.from(data, encoding || this._encoding);
      }
      this._buffers.push(dataBuffer);
      this._buffered += dataBuffer.length;
      this._process();
      if (this._reads && this._reads.length === 0) {
        this._paused = true;
      }
      return this.writable && !this._paused;
    };
    ChunkStream.prototype.end = function(data, encoding) {
      if (data) {
        this.write(data, encoding);
      }
      this.writable = false;
      if (!this._buffers) {
        return;
      }
      if (this._buffers.length === 0) {
        this._end();
      } else {
        this._buffers.push(null);
        this._process();
      }
    };
    ChunkStream.prototype.destroySoon = ChunkStream.prototype.end;
    ChunkStream.prototype._end = function() {
      if (this._reads.length > 0) {
        this.emit("error", new Error("Unexpected end of input"));
      }
      this.destroy();
    };
    ChunkStream.prototype.destroy = function() {
      if (!this._buffers) {
        return;
      }
      this.writable = false;
      this._reads = null;
      this._buffers = null;
      this.emit("close");
    };
    ChunkStream.prototype._processReadAllowingLess = function(read) {
      this._reads.shift();
      let smallerBuf = this._buffers[0];
      if (smallerBuf.length > read.length) {
        this._buffered -= read.length;
        this._buffers[0] = smallerBuf.slice(read.length);
        read.func.call(this, smallerBuf.slice(0, read.length));
      } else {
        this._buffered -= smallerBuf.length;
        this._buffers.shift();
        read.func.call(this, smallerBuf);
      }
    };
    ChunkStream.prototype._processRead = function(read) {
      this._reads.shift();
      let pos = 0;
      let count = 0;
      let data = Buffer.alloc(read.length);
      while (pos < read.length) {
        let buf = this._buffers[count++];
        let len = Math.min(buf.length, read.length - pos);
        buf.copy(data, pos, 0, len);
        pos += len;
        if (len !== buf.length) {
          this._buffers[--count] = buf.slice(len);
        }
      }
      if (count > 0) {
        this._buffers.splice(0, count);
      }
      this._buffered -= read.length;
      read.func.call(this, data);
    };
    ChunkStream.prototype._process = function() {
      try {
        while (this._buffered > 0 && this._reads && this._reads.length > 0) {
          let read = this._reads[0];
          if (read.allowLess) {
            this._processReadAllowingLess(read);
          } else if (this._buffered >= read.length) {
            this._processRead(read);
          } else {
            break;
          }
        }
        if (this._buffers && !this.writable) {
          this._end();
        }
      } catch (ex) {
        this.emit("error", ex);
      }
    };
  }
});

// node_modules/pngjs/lib/interlace.js
var require_interlace = __commonJS({
  "node_modules/pngjs/lib/interlace.js"(exports) {
    "use strict";
    var imagePasses = [
      {
        // pass 1 - 1px
        x: [0],
        y: [0]
      },
      {
        // pass 2 - 1px
        x: [4],
        y: [0]
      },
      {
        // pass 3 - 2px
        x: [0, 4],
        y: [4]
      },
      {
        // pass 4 - 4px
        x: [2, 6],
        y: [0, 4]
      },
      {
        // pass 5 - 8px
        x: [0, 2, 4, 6],
        y: [2, 6]
      },
      {
        // pass 6 - 16px
        x: [1, 3, 5, 7],
        y: [0, 2, 4, 6]
      },
      {
        // pass 7 - 32px
        x: [0, 1, 2, 3, 4, 5, 6, 7],
        y: [1, 3, 5, 7]
      }
    ];
    exports.getImagePasses = function(width, height) {
      let images = [];
      let xLeftOver = width % 8;
      let yLeftOver = height % 8;
      let xRepeats = (width - xLeftOver) / 8;
      let yRepeats = (height - yLeftOver) / 8;
      for (let i = 0; i < imagePasses.length; i++) {
        let pass = imagePasses[i];
        let passWidth = xRepeats * pass.x.length;
        let passHeight = yRepeats * pass.y.length;
        for (let j = 0; j < pass.x.length; j++) {
          if (pass.x[j] < xLeftOver) {
            passWidth++;
          } else {
            break;
          }
        }
        for (let j = 0; j < pass.y.length; j++) {
          if (pass.y[j] < yLeftOver) {
            passHeight++;
          } else {
            break;
          }
        }
        if (passWidth > 0 && passHeight > 0) {
          images.push({ width: passWidth, height: passHeight, index: i });
        }
      }
      return images;
    };
    exports.getInterlaceIterator = function(width) {
      return function(x, y, pass) {
        let outerXLeftOver = x % imagePasses[pass].x.length;
        let outerX = (x - outerXLeftOver) / imagePasses[pass].x.length * 8 + imagePasses[pass].x[outerXLeftOver];
        let outerYLeftOver = y % imagePasses[pass].y.length;
        let outerY = (y - outerYLeftOver) / imagePasses[pass].y.length * 8 + imagePasses[pass].y[outerYLeftOver];
        return outerX * 4 + outerY * width * 4;
      };
    };
  }
});

// node_modules/pngjs/lib/paeth-predictor.js
var require_paeth_predictor = __commonJS({
  "node_modules/pngjs/lib/paeth-predictor.js"(exports, module) {
    "use strict";
    module.exports = function paethPredictor(left, above, upLeft) {
      let paeth = left + above - upLeft;
      let pLeft = Math.abs(paeth - left);
      let pAbove = Math.abs(paeth - above);
      let pUpLeft = Math.abs(paeth - upLeft);
      if (pLeft <= pAbove && pLeft <= pUpLeft) {
        return left;
      }
      if (pAbove <= pUpLeft) {
        return above;
      }
      return upLeft;
    };
  }
});

// node_modules/pngjs/lib/filter-parse.js
var require_filter_parse = __commonJS({
  "node_modules/pngjs/lib/filter-parse.js"(exports, module) {
    "use strict";
    var interlaceUtils = require_interlace();
    var paethPredictor = require_paeth_predictor();
    function getByteWidth(width, bpp, depth) {
      let byteWidth = width * bpp;
      if (depth !== 8) {
        byteWidth = Math.ceil(byteWidth / (8 / depth));
      }
      return byteWidth;
    }
    var Filter = module.exports = function(bitmapInfo, dependencies) {
      let width = bitmapInfo.width;
      let height = bitmapInfo.height;
      let interlace = bitmapInfo.interlace;
      let bpp = bitmapInfo.bpp;
      let depth = bitmapInfo.depth;
      this.read = dependencies.read;
      this.write = dependencies.write;
      this.complete = dependencies.complete;
      this._imageIndex = 0;
      this._images = [];
      if (interlace) {
        let passes = interlaceUtils.getImagePasses(width, height);
        for (let i = 0; i < passes.length; i++) {
          this._images.push({
            byteWidth: getByteWidth(passes[i].width, bpp, depth),
            height: passes[i].height,
            lineIndex: 0
          });
        }
      } else {
        this._images.push({
          byteWidth: getByteWidth(width, bpp, depth),
          height,
          lineIndex: 0
        });
      }
      if (depth === 8) {
        this._xComparison = bpp;
      } else if (depth === 16) {
        this._xComparison = bpp * 2;
      } else {
        this._xComparison = 1;
      }
    };
    Filter.prototype.start = function() {
      this.read(
        this._images[this._imageIndex].byteWidth + 1,
        this._reverseFilterLine.bind(this)
      );
    };
    Filter.prototype._unFilterType1 = function(rawData, unfilteredLine, byteWidth) {
      let xComparison = this._xComparison;
      let xBiggerThan = xComparison - 1;
      for (let x = 0; x < byteWidth; x++) {
        let rawByte = rawData[1 + x];
        let f1Left = x > xBiggerThan ? unfilteredLine[x - xComparison] : 0;
        unfilteredLine[x] = rawByte + f1Left;
      }
    };
    Filter.prototype._unFilterType2 = function(rawData, unfilteredLine, byteWidth) {
      let lastLine = this._lastLine;
      for (let x = 0; x < byteWidth; x++) {
        let rawByte = rawData[1 + x];
        let f2Up = lastLine ? lastLine[x] : 0;
        unfilteredLine[x] = rawByte + f2Up;
      }
    };
    Filter.prototype._unFilterType3 = function(rawData, unfilteredLine, byteWidth) {
      let xComparison = this._xComparison;
      let xBiggerThan = xComparison - 1;
      let lastLine = this._lastLine;
      for (let x = 0; x < byteWidth; x++) {
        let rawByte = rawData[1 + x];
        let f3Up = lastLine ? lastLine[x] : 0;
        let f3Left = x > xBiggerThan ? unfilteredLine[x - xComparison] : 0;
        let f3Add = Math.floor((f3Left + f3Up) / 2);
        unfilteredLine[x] = rawByte + f3Add;
      }
    };
    Filter.prototype._unFilterType4 = function(rawData, unfilteredLine, byteWidth) {
      let xComparison = this._xComparison;
      let xBiggerThan = xComparison - 1;
      let lastLine = this._lastLine;
      for (let x = 0; x < byteWidth; x++) {
        let rawByte = rawData[1 + x];
        let f4Up = lastLine ? lastLine[x] : 0;
        let f4Left = x > xBiggerThan ? unfilteredLine[x - xComparison] : 0;
        let f4UpLeft = x > xBiggerThan && lastLine ? lastLine[x - xComparison] : 0;
        let f4Add = paethPredictor(f4Left, f4Up, f4UpLeft);
        unfilteredLine[x] = rawByte + f4Add;
      }
    };
    Filter.prototype._reverseFilterLine = function(rawData) {
      let filter = rawData[0];
      let unfilteredLine;
      let currentImage = this._images[this._imageIndex];
      let byteWidth = currentImage.byteWidth;
      if (filter === 0) {
        unfilteredLine = rawData.slice(1, byteWidth + 1);
      } else {
        unfilteredLine = Buffer.alloc(byteWidth);
        switch (filter) {
          case 1:
            this._unFilterType1(rawData, unfilteredLine, byteWidth);
            break;
          case 2:
            this._unFilterType2(rawData, unfilteredLine, byteWidth);
            break;
          case 3:
            this._unFilterType3(rawData, unfilteredLine, byteWidth);
            break;
          case 4:
            this._unFilterType4(rawData, unfilteredLine, byteWidth);
            break;
          default:
            throw new Error("Unrecognised filter type - " + filter);
        }
      }
      this.write(unfilteredLine);
      currentImage.lineIndex++;
      if (currentImage.lineIndex >= currentImage.height) {
        this._lastLine = null;
        this._imageIndex++;
        currentImage = this._images[this._imageIndex];
      } else {
        this._lastLine = unfilteredLine;
      }
      if (currentImage) {
        this.read(currentImage.byteWidth + 1, this._reverseFilterLine.bind(this));
      } else {
        this._lastLine = null;
        this.complete();
      }
    };
  }
});

// node_modules/pngjs/lib/filter-parse-async.js
var require_filter_parse_async = __commonJS({
  "node_modules/pngjs/lib/filter-parse-async.js"(exports, module) {
    "use strict";
    var util = __require("util");
    var ChunkStream = require_chunkstream();
    var Filter = require_filter_parse();
    var FilterAsync = module.exports = function(bitmapInfo) {
      ChunkStream.call(this);
      let buffers = [];
      let that = this;
      this._filter = new Filter(bitmapInfo, {
        read: this.read.bind(this),
        write: function(buffer) {
          buffers.push(buffer);
        },
        complete: function() {
          that.emit("complete", Buffer.concat(buffers));
        }
      });
      this._filter.start();
    };
    util.inherits(FilterAsync, ChunkStream);
  }
});

// node_modules/pngjs/lib/constants.js
var require_constants = __commonJS({
  "node_modules/pngjs/lib/constants.js"(exports, module) {
    "use strict";
    module.exports = {
      PNG_SIGNATURE: [137, 80, 78, 71, 13, 10, 26, 10],
      TYPE_IHDR: 1229472850,
      TYPE_IEND: 1229278788,
      TYPE_IDAT: 1229209940,
      TYPE_PLTE: 1347179589,
      TYPE_tRNS: 1951551059,
      // eslint-disable-line camelcase
      TYPE_gAMA: 1732332865,
      // eslint-disable-line camelcase
      // color-type bits
      COLORTYPE_GRAYSCALE: 0,
      COLORTYPE_PALETTE: 1,
      COLORTYPE_COLOR: 2,
      COLORTYPE_ALPHA: 4,
      // e.g. grayscale and alpha
      // color-type combinations
      COLORTYPE_PALETTE_COLOR: 3,
      COLORTYPE_COLOR_ALPHA: 6,
      COLORTYPE_TO_BPP_MAP: {
        0: 1,
        2: 3,
        3: 1,
        4: 2,
        6: 4
      },
      GAMMA_DIVISION: 1e5
    };
  }
});

// node_modules/pngjs/lib/crc.js
var require_crc = __commonJS({
  "node_modules/pngjs/lib/crc.js"(exports, module) {
    "use strict";
    var crcTable = [];
    (function() {
      for (let i = 0; i < 256; i++) {
        let currentCrc = i;
        for (let j = 0; j < 8; j++) {
          if (currentCrc & 1) {
            currentCrc = 3988292384 ^ currentCrc >>> 1;
          } else {
            currentCrc = currentCrc >>> 1;
          }
        }
        crcTable[i] = currentCrc;
      }
    })();
    var CrcCalculator = module.exports = function() {
      this._crc = -1;
    };
    CrcCalculator.prototype.write = function(data) {
      for (let i = 0; i < data.length; i++) {
        this._crc = crcTable[(this._crc ^ data[i]) & 255] ^ this._crc >>> 8;
      }
      return true;
    };
    CrcCalculator.prototype.crc32 = function() {
      return this._crc ^ -1;
    };
    CrcCalculator.crc32 = function(buf) {
      let crc = -1;
      for (let i = 0; i < buf.length; i++) {
        crc = crcTable[(crc ^ buf[i]) & 255] ^ crc >>> 8;
      }
      return crc ^ -1;
    };
  }
});

// node_modules/pngjs/lib/parser.js
var require_parser = __commonJS({
  "node_modules/pngjs/lib/parser.js"(exports, module) {
    "use strict";
    var constants = require_constants();
    var CrcCalculator = require_crc();
    var Parser = module.exports = function(options, dependencies) {
      this._options = options;
      options.checkCRC = options.checkCRC !== false;
      this._hasIHDR = false;
      this._hasIEND = false;
      this._emittedHeadersFinished = false;
      this._palette = [];
      this._colorType = 0;
      this._chunks = {};
      this._chunks[constants.TYPE_IHDR] = this._handleIHDR.bind(this);
      this._chunks[constants.TYPE_IEND] = this._handleIEND.bind(this);
      this._chunks[constants.TYPE_IDAT] = this._handleIDAT.bind(this);
      this._chunks[constants.TYPE_PLTE] = this._handlePLTE.bind(this);
      this._chunks[constants.TYPE_tRNS] = this._handleTRNS.bind(this);
      this._chunks[constants.TYPE_gAMA] = this._handleGAMA.bind(this);
      this.read = dependencies.read;
      this.error = dependencies.error;
      this.metadata = dependencies.metadata;
      this.gamma = dependencies.gamma;
      this.transColor = dependencies.transColor;
      this.palette = dependencies.palette;
      this.parsed = dependencies.parsed;
      this.inflateData = dependencies.inflateData;
      this.finished = dependencies.finished;
      this.simpleTransparency = dependencies.simpleTransparency;
      this.headersFinished = dependencies.headersFinished || function() {
      };
    };
    Parser.prototype.start = function() {
      this.read(constants.PNG_SIGNATURE.length, this._parseSignature.bind(this));
    };
    Parser.prototype._parseSignature = function(data) {
      let signature = constants.PNG_SIGNATURE;
      for (let i = 0; i < signature.length; i++) {
        if (data[i] !== signature[i]) {
          this.error(new Error("Invalid file signature"));
          return;
        }
      }
      this.read(8, this._parseChunkBegin.bind(this));
    };
    Parser.prototype._parseChunkBegin = function(data) {
      let length = data.readUInt32BE(0);
      let type = data.readUInt32BE(4);
      let name2 = "";
      for (let i = 4; i < 8; i++) {
        name2 += String.fromCharCode(data[i]);
      }
      let ancillary = Boolean(data[4] & 32);
      if (!this._hasIHDR && type !== constants.TYPE_IHDR) {
        this.error(new Error("Expected IHDR on beggining"));
        return;
      }
      this._crc = new CrcCalculator();
      this._crc.write(Buffer.from(name2));
      if (this._chunks[type]) {
        return this._chunks[type](length);
      }
      if (!ancillary) {
        this.error(new Error("Unsupported critical chunk type " + name2));
        return;
      }
      this.read(length + 4, this._skipChunk.bind(this));
    };
    Parser.prototype._skipChunk = function() {
      this.read(8, this._parseChunkBegin.bind(this));
    };
    Parser.prototype._handleChunkEnd = function() {
      this.read(4, this._parseChunkEnd.bind(this));
    };
    Parser.prototype._parseChunkEnd = function(data) {
      let fileCrc = data.readInt32BE(0);
      let calcCrc = this._crc.crc32();
      if (this._options.checkCRC && calcCrc !== fileCrc) {
        this.error(new Error("Crc error - " + fileCrc + " - " + calcCrc));
        return;
      }
      if (!this._hasIEND) {
        this.read(8, this._parseChunkBegin.bind(this));
      }
    };
    Parser.prototype._handleIHDR = function(length) {
      this.read(length, this._parseIHDR.bind(this));
    };
    Parser.prototype._parseIHDR = function(data) {
      this._crc.write(data);
      let width = data.readUInt32BE(0);
      let height = data.readUInt32BE(4);
      let depth = data[8];
      let colorType = data[9];
      let compr = data[10];
      let filter = data[11];
      let interlace = data[12];
      if (depth !== 8 && depth !== 4 && depth !== 2 && depth !== 1 && depth !== 16) {
        this.error(new Error("Unsupported bit depth " + depth));
        return;
      }
      if (!(colorType in constants.COLORTYPE_TO_BPP_MAP)) {
        this.error(new Error("Unsupported color type"));
        return;
      }
      if (compr !== 0) {
        this.error(new Error("Unsupported compression method"));
        return;
      }
      if (filter !== 0) {
        this.error(new Error("Unsupported filter method"));
        return;
      }
      if (interlace !== 0 && interlace !== 1) {
        this.error(new Error("Unsupported interlace method"));
        return;
      }
      this._colorType = colorType;
      let bpp = constants.COLORTYPE_TO_BPP_MAP[this._colorType];
      this._hasIHDR = true;
      this.metadata({
        width,
        height,
        depth,
        interlace: Boolean(interlace),
        palette: Boolean(colorType & constants.COLORTYPE_PALETTE),
        color: Boolean(colorType & constants.COLORTYPE_COLOR),
        alpha: Boolean(colorType & constants.COLORTYPE_ALPHA),
        bpp,
        colorType
      });
      this._handleChunkEnd();
    };
    Parser.prototype._handlePLTE = function(length) {
      this.read(length, this._parsePLTE.bind(this));
    };
    Parser.prototype._parsePLTE = function(data) {
      this._crc.write(data);
      let entries = Math.floor(data.length / 3);
      for (let i = 0; i < entries; i++) {
        this._palette.push([data[i * 3], data[i * 3 + 1], data[i * 3 + 2], 255]);
      }
      this.palette(this._palette);
      this._handleChunkEnd();
    };
    Parser.prototype._handleTRNS = function(length) {
      this.simpleTransparency();
      this.read(length, this._parseTRNS.bind(this));
    };
    Parser.prototype._parseTRNS = function(data) {
      this._crc.write(data);
      if (this._colorType === constants.COLORTYPE_PALETTE_COLOR) {
        if (this._palette.length === 0) {
          this.error(new Error("Transparency chunk must be after palette"));
          return;
        }
        if (data.length > this._palette.length) {
          this.error(new Error("More transparent colors than palette size"));
          return;
        }
        for (let i = 0; i < data.length; i++) {
          this._palette[i][3] = data[i];
        }
        this.palette(this._palette);
      }
      if (this._colorType === constants.COLORTYPE_GRAYSCALE) {
        this.transColor([data.readUInt16BE(0)]);
      }
      if (this._colorType === constants.COLORTYPE_COLOR) {
        this.transColor([
          data.readUInt16BE(0),
          data.readUInt16BE(2),
          data.readUInt16BE(4)
        ]);
      }
      this._handleChunkEnd();
    };
    Parser.prototype._handleGAMA = function(length) {
      this.read(length, this._parseGAMA.bind(this));
    };
    Parser.prototype._parseGAMA = function(data) {
      this._crc.write(data);
      this.gamma(data.readUInt32BE(0) / constants.GAMMA_DIVISION);
      this._handleChunkEnd();
    };
    Parser.prototype._handleIDAT = function(length) {
      if (!this._emittedHeadersFinished) {
        this._emittedHeadersFinished = true;
        this.headersFinished();
      }
      this.read(-length, this._parseIDAT.bind(this, length));
    };
    Parser.prototype._parseIDAT = function(length, data) {
      this._crc.write(data);
      if (this._colorType === constants.COLORTYPE_PALETTE_COLOR && this._palette.length === 0) {
        throw new Error("Expected palette not found");
      }
      this.inflateData(data);
      let leftOverLength = length - data.length;
      if (leftOverLength > 0) {
        this._handleIDAT(leftOverLength);
      } else {
        this._handleChunkEnd();
      }
    };
    Parser.prototype._handleIEND = function(length) {
      this.read(length, this._parseIEND.bind(this));
    };
    Parser.prototype._parseIEND = function(data) {
      this._crc.write(data);
      this._hasIEND = true;
      this._handleChunkEnd();
      if (this.finished) {
        this.finished();
      }
    };
  }
});

// node_modules/pngjs/lib/bitmapper.js
var require_bitmapper = __commonJS({
  "node_modules/pngjs/lib/bitmapper.js"(exports) {
    "use strict";
    var interlaceUtils = require_interlace();
    var pixelBppMapper = [
      // 0 - dummy entry
      function() {
      },
      // 1 - L
      // 0: 0, 1: 0, 2: 0, 3: 0xff
      function(pxData, data, pxPos, rawPos) {
        if (rawPos === data.length) {
          throw new Error("Ran out of data");
        }
        let pixel = data[rawPos];
        pxData[pxPos] = pixel;
        pxData[pxPos + 1] = pixel;
        pxData[pxPos + 2] = pixel;
        pxData[pxPos + 3] = 255;
      },
      // 2 - LA
      // 0: 0, 1: 0, 2: 0, 3: 1
      function(pxData, data, pxPos, rawPos) {
        if (rawPos + 1 >= data.length) {
          throw new Error("Ran out of data");
        }
        let pixel = data[rawPos];
        pxData[pxPos] = pixel;
        pxData[pxPos + 1] = pixel;
        pxData[pxPos + 2] = pixel;
        pxData[pxPos + 3] = data[rawPos + 1];
      },
      // 3 - RGB
      // 0: 0, 1: 1, 2: 2, 3: 0xff
      function(pxData, data, pxPos, rawPos) {
        if (rawPos + 2 >= data.length) {
          throw new Error("Ran out of data");
        }
        pxData[pxPos] = data[rawPos];
        pxData[pxPos + 1] = data[rawPos + 1];
        pxData[pxPos + 2] = data[rawPos + 2];
        pxData[pxPos + 3] = 255;
      },
      // 4 - RGBA
      // 0: 0, 1: 1, 2: 2, 3: 3
      function(pxData, data, pxPos, rawPos) {
        if (rawPos + 3 >= data.length) {
          throw new Error("Ran out of data");
        }
        pxData[pxPos] = data[rawPos];
        pxData[pxPos + 1] = data[rawPos + 1];
        pxData[pxPos + 2] = data[rawPos + 2];
        pxData[pxPos + 3] = data[rawPos + 3];
      }
    ];
    var pixelBppCustomMapper = [
      // 0 - dummy entry
      function() {
      },
      // 1 - L
      // 0: 0, 1: 0, 2: 0, 3: 0xff
      function(pxData, pixelData, pxPos, maxBit) {
        let pixel = pixelData[0];
        pxData[pxPos] = pixel;
        pxData[pxPos + 1] = pixel;
        pxData[pxPos + 2] = pixel;
        pxData[pxPos + 3] = maxBit;
      },
      // 2 - LA
      // 0: 0, 1: 0, 2: 0, 3: 1
      function(pxData, pixelData, pxPos) {
        let pixel = pixelData[0];
        pxData[pxPos] = pixel;
        pxData[pxPos + 1] = pixel;
        pxData[pxPos + 2] = pixel;
        pxData[pxPos + 3] = pixelData[1];
      },
      // 3 - RGB
      // 0: 0, 1: 1, 2: 2, 3: 0xff
      function(pxData, pixelData, pxPos, maxBit) {
        pxData[pxPos] = pixelData[0];
        pxData[pxPos + 1] = pixelData[1];
        pxData[pxPos + 2] = pixelData[2];
        pxData[pxPos + 3] = maxBit;
      },
      // 4 - RGBA
      // 0: 0, 1: 1, 2: 2, 3: 3
      function(pxData, pixelData, pxPos) {
        pxData[pxPos] = pixelData[0];
        pxData[pxPos + 1] = pixelData[1];
        pxData[pxPos + 2] = pixelData[2];
        pxData[pxPos + 3] = pixelData[3];
      }
    ];
    function bitRetriever(data, depth) {
      let leftOver = [];
      let i = 0;
      function split() {
        if (i === data.length) {
          throw new Error("Ran out of data");
        }
        let byte = data[i];
        i++;
        let byte8, byte7, byte6, byte5, byte4, byte3, byte2, byte1;
        switch (depth) {
          default:
            throw new Error("unrecognised depth");
          case 16:
            byte2 = data[i];
            i++;
            leftOver.push((byte << 8) + byte2);
            break;
          case 4:
            byte2 = byte & 15;
            byte1 = byte >> 4;
            leftOver.push(byte1, byte2);
            break;
          case 2:
            byte4 = byte & 3;
            byte3 = byte >> 2 & 3;
            byte2 = byte >> 4 & 3;
            byte1 = byte >> 6 & 3;
            leftOver.push(byte1, byte2, byte3, byte4);
            break;
          case 1:
            byte8 = byte & 1;
            byte7 = byte >> 1 & 1;
            byte6 = byte >> 2 & 1;
            byte5 = byte >> 3 & 1;
            byte4 = byte >> 4 & 1;
            byte3 = byte >> 5 & 1;
            byte2 = byte >> 6 & 1;
            byte1 = byte >> 7 & 1;
            leftOver.push(byte1, byte2, byte3, byte4, byte5, byte6, byte7, byte8);
            break;
        }
      }
      return {
        get: function(count) {
          while (leftOver.length < count) {
            split();
          }
          let returner = leftOver.slice(0, count);
          leftOver = leftOver.slice(count);
          return returner;
        },
        resetAfterLine: function() {
          leftOver.length = 0;
        },
        end: function() {
          if (i !== data.length) {
            throw new Error("extra data found");
          }
        }
      };
    }
    function mapImage8Bit(image, pxData, getPxPos, bpp, data, rawPos) {
      let imageWidth = image.width;
      let imageHeight = image.height;
      let imagePass = image.index;
      for (let y = 0; y < imageHeight; y++) {
        for (let x = 0; x < imageWidth; x++) {
          let pxPos = getPxPos(x, y, imagePass);
          pixelBppMapper[bpp](pxData, data, pxPos, rawPos);
          rawPos += bpp;
        }
      }
      return rawPos;
    }
    function mapImageCustomBit(image, pxData, getPxPos, bpp, bits, maxBit) {
      let imageWidth = image.width;
      let imageHeight = image.height;
      let imagePass = image.index;
      for (let y = 0; y < imageHeight; y++) {
        for (let x = 0; x < imageWidth; x++) {
          let pixelData = bits.get(bpp);
          let pxPos = getPxPos(x, y, imagePass);
          pixelBppCustomMapper[bpp](pxData, pixelData, pxPos, maxBit);
        }
        bits.resetAfterLine();
      }
    }
    exports.dataToBitMap = function(data, bitmapInfo) {
      let width = bitmapInfo.width;
      let height = bitmapInfo.height;
      let depth = bitmapInfo.depth;
      let bpp = bitmapInfo.bpp;
      let interlace = bitmapInfo.interlace;
      let bits;
      if (depth !== 8) {
        bits = bitRetriever(data, depth);
      }
      let pxData;
      if (depth <= 8) {
        pxData = Buffer.alloc(width * height * 4);
      } else {
        pxData = new Uint16Array(width * height * 4);
      }
      let maxBit = Math.pow(2, depth) - 1;
      let rawPos = 0;
      let images;
      let getPxPos;
      if (interlace) {
        images = interlaceUtils.getImagePasses(width, height);
        getPxPos = interlaceUtils.getInterlaceIterator(width, height);
      } else {
        let nonInterlacedPxPos = 0;
        getPxPos = function() {
          let returner = nonInterlacedPxPos;
          nonInterlacedPxPos += 4;
          return returner;
        };
        images = [{ width, height }];
      }
      for (let imageIndex = 0; imageIndex < images.length; imageIndex++) {
        if (depth === 8) {
          rawPos = mapImage8Bit(
            images[imageIndex],
            pxData,
            getPxPos,
            bpp,
            data,
            rawPos
          );
        } else {
          mapImageCustomBit(
            images[imageIndex],
            pxData,
            getPxPos,
            bpp,
            bits,
            maxBit
          );
        }
      }
      if (depth === 8) {
        if (rawPos !== data.length) {
          throw new Error("extra data found");
        }
      } else {
        bits.end();
      }
      return pxData;
    };
  }
});

// node_modules/pngjs/lib/format-normaliser.js
var require_format_normaliser = __commonJS({
  "node_modules/pngjs/lib/format-normaliser.js"(exports, module) {
    "use strict";
    function dePalette(indata, outdata, width, height, palette) {
      let pxPos = 0;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          let color = palette[indata[pxPos]];
          if (!color) {
            throw new Error("index " + indata[pxPos] + " not in palette");
          }
          for (let i = 0; i < 4; i++) {
            outdata[pxPos + i] = color[i];
          }
          pxPos += 4;
        }
      }
    }
    function replaceTransparentColor(indata, outdata, width, height, transColor) {
      let pxPos = 0;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          let makeTrans = false;
          if (transColor.length === 1) {
            if (transColor[0] === indata[pxPos]) {
              makeTrans = true;
            }
          } else if (transColor[0] === indata[pxPos] && transColor[1] === indata[pxPos + 1] && transColor[2] === indata[pxPos + 2]) {
            makeTrans = true;
          }
          if (makeTrans) {
            for (let i = 0; i < 4; i++) {
              outdata[pxPos + i] = 0;
            }
          }
          pxPos += 4;
        }
      }
    }
    function scaleDepth(indata, outdata, width, height, depth) {
      let maxOutSample = 255;
      let maxInSample = Math.pow(2, depth) - 1;
      let pxPos = 0;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          for (let i = 0; i < 4; i++) {
            outdata[pxPos + i] = Math.floor(
              indata[pxPos + i] * maxOutSample / maxInSample + 0.5
            );
          }
          pxPos += 4;
        }
      }
    }
    module.exports = function(indata, imageData, skipRescale = false) {
      let depth = imageData.depth;
      let width = imageData.width;
      let height = imageData.height;
      let colorType = imageData.colorType;
      let transColor = imageData.transColor;
      let palette = imageData.palette;
      let outdata = indata;
      if (colorType === 3) {
        dePalette(indata, outdata, width, height, palette);
      } else {
        if (transColor) {
          replaceTransparentColor(indata, outdata, width, height, transColor);
        }
        if (depth !== 8 && !skipRescale) {
          if (depth === 16) {
            outdata = Buffer.alloc(width * height * 4);
          }
          scaleDepth(indata, outdata, width, height, depth);
        }
      }
      return outdata;
    };
  }
});

// node_modules/pngjs/lib/parser-async.js
var require_parser_async = __commonJS({
  "node_modules/pngjs/lib/parser-async.js"(exports, module) {
    "use strict";
    var util = __require("util");
    var zlib = __require("zlib");
    var ChunkStream = require_chunkstream();
    var FilterAsync = require_filter_parse_async();
    var Parser = require_parser();
    var bitmapper = require_bitmapper();
    var formatNormaliser = require_format_normaliser();
    var ParserAsync = module.exports = function(options) {
      ChunkStream.call(this);
      this._parser = new Parser(options, {
        read: this.read.bind(this),
        error: this._handleError.bind(this),
        metadata: this._handleMetaData.bind(this),
        gamma: this.emit.bind(this, "gamma"),
        palette: this._handlePalette.bind(this),
        transColor: this._handleTransColor.bind(this),
        finished: this._finished.bind(this),
        inflateData: this._inflateData.bind(this),
        simpleTransparency: this._simpleTransparency.bind(this),
        headersFinished: this._headersFinished.bind(this)
      });
      this._options = options;
      this.writable = true;
      this._parser.start();
    };
    util.inherits(ParserAsync, ChunkStream);
    ParserAsync.prototype._handleError = function(err) {
      this.emit("error", err);
      this.writable = false;
      this.destroy();
      if (this._inflate && this._inflate.destroy) {
        this._inflate.destroy();
      }
      if (this._filter) {
        this._filter.destroy();
        this._filter.on("error", function() {
        });
      }
      this.errord = true;
    };
    ParserAsync.prototype._inflateData = function(data) {
      if (!this._inflate) {
        if (this._bitmapInfo.interlace) {
          this._inflate = zlib.createInflate();
          this._inflate.on("error", this.emit.bind(this, "error"));
          this._filter.on("complete", this._complete.bind(this));
          this._inflate.pipe(this._filter);
        } else {
          let rowSize = (this._bitmapInfo.width * this._bitmapInfo.bpp * this._bitmapInfo.depth + 7 >> 3) + 1;
          let imageSize = rowSize * this._bitmapInfo.height;
          let chunkSize = Math.max(imageSize, zlib.Z_MIN_CHUNK);
          this._inflate = zlib.createInflate({ chunkSize });
          let leftToInflate = imageSize;
          let emitError = this.emit.bind(this, "error");
          this._inflate.on("error", function(err) {
            if (!leftToInflate) {
              return;
            }
            emitError(err);
          });
          this._filter.on("complete", this._complete.bind(this));
          let filterWrite = this._filter.write.bind(this._filter);
          this._inflate.on("data", function(chunk) {
            if (!leftToInflate) {
              return;
            }
            if (chunk.length > leftToInflate) {
              chunk = chunk.slice(0, leftToInflate);
            }
            leftToInflate -= chunk.length;
            filterWrite(chunk);
          });
          this._inflate.on("end", this._filter.end.bind(this._filter));
        }
      }
      this._inflate.write(data);
    };
    ParserAsync.prototype._handleMetaData = function(metaData) {
      this._metaData = metaData;
      this._bitmapInfo = Object.create(metaData);
      this._filter = new FilterAsync(this._bitmapInfo);
    };
    ParserAsync.prototype._handleTransColor = function(transColor) {
      this._bitmapInfo.transColor = transColor;
    };
    ParserAsync.prototype._handlePalette = function(palette) {
      this._bitmapInfo.palette = palette;
    };
    ParserAsync.prototype._simpleTransparency = function() {
      this._metaData.alpha = true;
    };
    ParserAsync.prototype._headersFinished = function() {
      this.emit("metadata", this._metaData);
    };
    ParserAsync.prototype._finished = function() {
      if (this.errord) {
        return;
      }
      if (!this._inflate) {
        this.emit("error", "No Inflate block");
      } else {
        this._inflate.end();
      }
    };
    ParserAsync.prototype._complete = function(filteredData) {
      if (this.errord) {
        return;
      }
      let normalisedBitmapData;
      try {
        let bitmapData = bitmapper.dataToBitMap(filteredData, this._bitmapInfo);
        normalisedBitmapData = formatNormaliser(
          bitmapData,
          this._bitmapInfo,
          this._options.skipRescale
        );
        bitmapData = null;
      } catch (ex) {
        this._handleError(ex);
        return;
      }
      this.emit("parsed", normalisedBitmapData);
    };
  }
});

// node_modules/pngjs/lib/bitpacker.js
var require_bitpacker = __commonJS({
  "node_modules/pngjs/lib/bitpacker.js"(exports, module) {
    "use strict";
    var constants = require_constants();
    module.exports = function(dataIn, width, height, options) {
      let outHasAlpha = [constants.COLORTYPE_COLOR_ALPHA, constants.COLORTYPE_ALPHA].indexOf(
        options.colorType
      ) !== -1;
      if (options.colorType === options.inputColorType) {
        let bigEndian = (function() {
          let buffer = new ArrayBuffer(2);
          new DataView(buffer).setInt16(
            0,
            256,
            true
            /* littleEndian */
          );
          return new Int16Array(buffer)[0] !== 256;
        })();
        if (options.bitDepth === 8 || options.bitDepth === 16 && bigEndian) {
          return dataIn;
        }
      }
      let data = options.bitDepth !== 16 ? dataIn : new Uint16Array(dataIn.buffer);
      let maxValue = 255;
      let inBpp = constants.COLORTYPE_TO_BPP_MAP[options.inputColorType];
      if (inBpp === 4 && !options.inputHasAlpha) {
        inBpp = 3;
      }
      let outBpp = constants.COLORTYPE_TO_BPP_MAP[options.colorType];
      if (options.bitDepth === 16) {
        maxValue = 65535;
        outBpp *= 2;
      }
      let outData = Buffer.alloc(width * height * outBpp);
      let inIndex = 0;
      let outIndex = 0;
      let bgColor = options.bgColor || {};
      if (bgColor.red === void 0) {
        bgColor.red = maxValue;
      }
      if (bgColor.green === void 0) {
        bgColor.green = maxValue;
      }
      if (bgColor.blue === void 0) {
        bgColor.blue = maxValue;
      }
      function getRGBA() {
        let red;
        let green;
        let blue;
        let alpha = maxValue;
        switch (options.inputColorType) {
          case constants.COLORTYPE_COLOR_ALPHA:
            alpha = data[inIndex + 3];
            red = data[inIndex];
            green = data[inIndex + 1];
            blue = data[inIndex + 2];
            break;
          case constants.COLORTYPE_COLOR:
            red = data[inIndex];
            green = data[inIndex + 1];
            blue = data[inIndex + 2];
            break;
          case constants.COLORTYPE_ALPHA:
            alpha = data[inIndex + 1];
            red = data[inIndex];
            green = red;
            blue = red;
            break;
          case constants.COLORTYPE_GRAYSCALE:
            red = data[inIndex];
            green = red;
            blue = red;
            break;
          default:
            throw new Error(
              "input color type:" + options.inputColorType + " is not supported at present"
            );
        }
        if (options.inputHasAlpha) {
          if (!outHasAlpha) {
            alpha /= maxValue;
            red = Math.min(
              Math.max(Math.round((1 - alpha) * bgColor.red + alpha * red), 0),
              maxValue
            );
            green = Math.min(
              Math.max(Math.round((1 - alpha) * bgColor.green + alpha * green), 0),
              maxValue
            );
            blue = Math.min(
              Math.max(Math.round((1 - alpha) * bgColor.blue + alpha * blue), 0),
              maxValue
            );
          }
        }
        return { red, green, blue, alpha };
      }
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          let rgba = getRGBA(data, inIndex);
          switch (options.colorType) {
            case constants.COLORTYPE_COLOR_ALPHA:
            case constants.COLORTYPE_COLOR:
              if (options.bitDepth === 8) {
                outData[outIndex] = rgba.red;
                outData[outIndex + 1] = rgba.green;
                outData[outIndex + 2] = rgba.blue;
                if (outHasAlpha) {
                  outData[outIndex + 3] = rgba.alpha;
                }
              } else {
                outData.writeUInt16BE(rgba.red, outIndex);
                outData.writeUInt16BE(rgba.green, outIndex + 2);
                outData.writeUInt16BE(rgba.blue, outIndex + 4);
                if (outHasAlpha) {
                  outData.writeUInt16BE(rgba.alpha, outIndex + 6);
                }
              }
              break;
            case constants.COLORTYPE_ALPHA:
            case constants.COLORTYPE_GRAYSCALE: {
              let grayscale = (rgba.red + rgba.green + rgba.blue) / 3;
              if (options.bitDepth === 8) {
                outData[outIndex] = grayscale;
                if (outHasAlpha) {
                  outData[outIndex + 1] = rgba.alpha;
                }
              } else {
                outData.writeUInt16BE(grayscale, outIndex);
                if (outHasAlpha) {
                  outData.writeUInt16BE(rgba.alpha, outIndex + 2);
                }
              }
              break;
            }
            default:
              throw new Error("unrecognised color Type " + options.colorType);
          }
          inIndex += inBpp;
          outIndex += outBpp;
        }
      }
      return outData;
    };
  }
});

// node_modules/pngjs/lib/filter-pack.js
var require_filter_pack = __commonJS({
  "node_modules/pngjs/lib/filter-pack.js"(exports, module) {
    "use strict";
    var paethPredictor = require_paeth_predictor();
    function filterNone(pxData, pxPos, byteWidth, rawData, rawPos) {
      for (let x = 0; x < byteWidth; x++) {
        rawData[rawPos + x] = pxData[pxPos + x];
      }
    }
    function filterSumNone(pxData, pxPos, byteWidth) {
      let sum = 0;
      let length = pxPos + byteWidth;
      for (let i = pxPos; i < length; i++) {
        sum += Math.abs(pxData[i]);
      }
      return sum;
    }
    function filterSub(pxData, pxPos, byteWidth, rawData, rawPos, bpp) {
      for (let x = 0; x < byteWidth; x++) {
        let left = x >= bpp ? pxData[pxPos + x - bpp] : 0;
        let val = pxData[pxPos + x] - left;
        rawData[rawPos + x] = val;
      }
    }
    function filterSumSub(pxData, pxPos, byteWidth, bpp) {
      let sum = 0;
      for (let x = 0; x < byteWidth; x++) {
        let left = x >= bpp ? pxData[pxPos + x - bpp] : 0;
        let val = pxData[pxPos + x] - left;
        sum += Math.abs(val);
      }
      return sum;
    }
    function filterUp(pxData, pxPos, byteWidth, rawData, rawPos) {
      for (let x = 0; x < byteWidth; x++) {
        let up = pxPos > 0 ? pxData[pxPos + x - byteWidth] : 0;
        let val = pxData[pxPos + x] - up;
        rawData[rawPos + x] = val;
      }
    }
    function filterSumUp(pxData, pxPos, byteWidth) {
      let sum = 0;
      let length = pxPos + byteWidth;
      for (let x = pxPos; x < length; x++) {
        let up = pxPos > 0 ? pxData[x - byteWidth] : 0;
        let val = pxData[x] - up;
        sum += Math.abs(val);
      }
      return sum;
    }
    function filterAvg(pxData, pxPos, byteWidth, rawData, rawPos, bpp) {
      for (let x = 0; x < byteWidth; x++) {
        let left = x >= bpp ? pxData[pxPos + x - bpp] : 0;
        let up = pxPos > 0 ? pxData[pxPos + x - byteWidth] : 0;
        let val = pxData[pxPos + x] - (left + up >> 1);
        rawData[rawPos + x] = val;
      }
    }
    function filterSumAvg(pxData, pxPos, byteWidth, bpp) {
      let sum = 0;
      for (let x = 0; x < byteWidth; x++) {
        let left = x >= bpp ? pxData[pxPos + x - bpp] : 0;
        let up = pxPos > 0 ? pxData[pxPos + x - byteWidth] : 0;
        let val = pxData[pxPos + x] - (left + up >> 1);
        sum += Math.abs(val);
      }
      return sum;
    }
    function filterPaeth(pxData, pxPos, byteWidth, rawData, rawPos, bpp) {
      for (let x = 0; x < byteWidth; x++) {
        let left = x >= bpp ? pxData[pxPos + x - bpp] : 0;
        let up = pxPos > 0 ? pxData[pxPos + x - byteWidth] : 0;
        let upleft = pxPos > 0 && x >= bpp ? pxData[pxPos + x - (byteWidth + bpp)] : 0;
        let val = pxData[pxPos + x] - paethPredictor(left, up, upleft);
        rawData[rawPos + x] = val;
      }
    }
    function filterSumPaeth(pxData, pxPos, byteWidth, bpp) {
      let sum = 0;
      for (let x = 0; x < byteWidth; x++) {
        let left = x >= bpp ? pxData[pxPos + x - bpp] : 0;
        let up = pxPos > 0 ? pxData[pxPos + x - byteWidth] : 0;
        let upleft = pxPos > 0 && x >= bpp ? pxData[pxPos + x - (byteWidth + bpp)] : 0;
        let val = pxData[pxPos + x] - paethPredictor(left, up, upleft);
        sum += Math.abs(val);
      }
      return sum;
    }
    var filters = {
      0: filterNone,
      1: filterSub,
      2: filterUp,
      3: filterAvg,
      4: filterPaeth
    };
    var filterSums = {
      0: filterSumNone,
      1: filterSumSub,
      2: filterSumUp,
      3: filterSumAvg,
      4: filterSumPaeth
    };
    module.exports = function(pxData, width, height, options, bpp) {
      let filterTypes;
      if (!("filterType" in options) || options.filterType === -1) {
        filterTypes = [0, 1, 2, 3, 4];
      } else if (typeof options.filterType === "number") {
        filterTypes = [options.filterType];
      } else {
        throw new Error("unrecognised filter types");
      }
      if (options.bitDepth === 16) {
        bpp *= 2;
      }
      let byteWidth = width * bpp;
      let rawPos = 0;
      let pxPos = 0;
      let rawData = Buffer.alloc((byteWidth + 1) * height);
      let sel = filterTypes[0];
      for (let y = 0; y < height; y++) {
        if (filterTypes.length > 1) {
          let min = Infinity;
          for (let i = 0; i < filterTypes.length; i++) {
            let sum = filterSums[filterTypes[i]](pxData, pxPos, byteWidth, bpp);
            if (sum < min) {
              sel = filterTypes[i];
              min = sum;
            }
          }
        }
        rawData[rawPos] = sel;
        rawPos++;
        filters[sel](pxData, pxPos, byteWidth, rawData, rawPos, bpp);
        rawPos += byteWidth;
        pxPos += byteWidth;
      }
      return rawData;
    };
  }
});

// node_modules/pngjs/lib/packer.js
var require_packer = __commonJS({
  "node_modules/pngjs/lib/packer.js"(exports, module) {
    "use strict";
    var constants = require_constants();
    var CrcStream = require_crc();
    var bitPacker = require_bitpacker();
    var filter = require_filter_pack();
    var zlib = __require("zlib");
    var Packer = module.exports = function(options) {
      this._options = options;
      options.deflateChunkSize = options.deflateChunkSize || 32 * 1024;
      options.deflateLevel = options.deflateLevel != null ? options.deflateLevel : 9;
      options.deflateStrategy = options.deflateStrategy != null ? options.deflateStrategy : 3;
      options.inputHasAlpha = options.inputHasAlpha != null ? options.inputHasAlpha : true;
      options.deflateFactory = options.deflateFactory || zlib.createDeflate;
      options.bitDepth = options.bitDepth || 8;
      options.colorType = typeof options.colorType === "number" ? options.colorType : constants.COLORTYPE_COLOR_ALPHA;
      options.inputColorType = typeof options.inputColorType === "number" ? options.inputColorType : constants.COLORTYPE_COLOR_ALPHA;
      if ([
        constants.COLORTYPE_GRAYSCALE,
        constants.COLORTYPE_COLOR,
        constants.COLORTYPE_COLOR_ALPHA,
        constants.COLORTYPE_ALPHA
      ].indexOf(options.colorType) === -1) {
        throw new Error(
          "option color type:" + options.colorType + " is not supported at present"
        );
      }
      if ([
        constants.COLORTYPE_GRAYSCALE,
        constants.COLORTYPE_COLOR,
        constants.COLORTYPE_COLOR_ALPHA,
        constants.COLORTYPE_ALPHA
      ].indexOf(options.inputColorType) === -1) {
        throw new Error(
          "option input color type:" + options.inputColorType + " is not supported at present"
        );
      }
      if (options.bitDepth !== 8 && options.bitDepth !== 16) {
        throw new Error(
          "option bit depth:" + options.bitDepth + " is not supported at present"
        );
      }
    };
    Packer.prototype.getDeflateOptions = function() {
      return {
        chunkSize: this._options.deflateChunkSize,
        level: this._options.deflateLevel,
        strategy: this._options.deflateStrategy
      };
    };
    Packer.prototype.createDeflate = function() {
      return this._options.deflateFactory(this.getDeflateOptions());
    };
    Packer.prototype.filterData = function(data, width, height) {
      let packedData = bitPacker(data, width, height, this._options);
      let bpp = constants.COLORTYPE_TO_BPP_MAP[this._options.colorType];
      let filteredData = filter(packedData, width, height, this._options, bpp);
      return filteredData;
    };
    Packer.prototype._packChunk = function(type, data) {
      let len = data ? data.length : 0;
      let buf = Buffer.alloc(len + 12);
      buf.writeUInt32BE(len, 0);
      buf.writeUInt32BE(type, 4);
      if (data) {
        data.copy(buf, 8);
      }
      buf.writeInt32BE(
        CrcStream.crc32(buf.slice(4, buf.length - 4)),
        buf.length - 4
      );
      return buf;
    };
    Packer.prototype.packGAMA = function(gamma) {
      let buf = Buffer.alloc(4);
      buf.writeUInt32BE(Math.floor(gamma * constants.GAMMA_DIVISION), 0);
      return this._packChunk(constants.TYPE_gAMA, buf);
    };
    Packer.prototype.packIHDR = function(width, height) {
      let buf = Buffer.alloc(13);
      buf.writeUInt32BE(width, 0);
      buf.writeUInt32BE(height, 4);
      buf[8] = this._options.bitDepth;
      buf[9] = this._options.colorType;
      buf[10] = 0;
      buf[11] = 0;
      buf[12] = 0;
      return this._packChunk(constants.TYPE_IHDR, buf);
    };
    Packer.prototype.packIDAT = function(data) {
      return this._packChunk(constants.TYPE_IDAT, data);
    };
    Packer.prototype.packIEND = function() {
      return this._packChunk(constants.TYPE_IEND, null);
    };
  }
});

// node_modules/pngjs/lib/packer-async.js
var require_packer_async = __commonJS({
  "node_modules/pngjs/lib/packer-async.js"(exports, module) {
    "use strict";
    var util = __require("util");
    var Stream = __require("stream");
    var constants = require_constants();
    var Packer = require_packer();
    var PackerAsync = module.exports = function(opt) {
      Stream.call(this);
      let options = opt || {};
      this._packer = new Packer(options);
      this._deflate = this._packer.createDeflate();
      this.readable = true;
    };
    util.inherits(PackerAsync, Stream);
    PackerAsync.prototype.pack = function(data, width, height, gamma) {
      this.emit("data", Buffer.from(constants.PNG_SIGNATURE));
      this.emit("data", this._packer.packIHDR(width, height));
      if (gamma) {
        this.emit("data", this._packer.packGAMA(gamma));
      }
      let filteredData = this._packer.filterData(data, width, height);
      this._deflate.on("error", this.emit.bind(this, "error"));
      this._deflate.on(
        "data",
        function(compressedData) {
          this.emit("data", this._packer.packIDAT(compressedData));
        }.bind(this)
      );
      this._deflate.on(
        "end",
        function() {
          this.emit("data", this._packer.packIEND());
          this.emit("end");
        }.bind(this)
      );
      this._deflate.end(filteredData);
    };
  }
});

// node_modules/pngjs/lib/sync-inflate.js
var require_sync_inflate = __commonJS({
  "node_modules/pngjs/lib/sync-inflate.js"(exports, module) {
    "use strict";
    var assert = __require("assert").ok;
    var zlib = __require("zlib");
    var util = __require("util");
    var kMaxLength = __require("buffer").kMaxLength;
    function Inflate(opts) {
      if (!(this instanceof Inflate)) {
        return new Inflate(opts);
      }
      if (opts && opts.chunkSize < zlib.Z_MIN_CHUNK) {
        opts.chunkSize = zlib.Z_MIN_CHUNK;
      }
      zlib.Inflate.call(this, opts);
      this._offset = this._offset === void 0 ? this._outOffset : this._offset;
      this._buffer = this._buffer || this._outBuffer;
      if (opts && opts.maxLength != null) {
        this._maxLength = opts.maxLength;
      }
    }
    function createInflate(opts) {
      return new Inflate(opts);
    }
    function _close(engine, callback) {
      if (callback) {
        process.nextTick(callback);
      }
      if (!engine._handle) {
        return;
      }
      engine._handle.close();
      engine._handle = null;
    }
    Inflate.prototype._processChunk = function(chunk, flushFlag, asyncCb) {
      if (typeof asyncCb === "function") {
        return zlib.Inflate._processChunk.call(this, chunk, flushFlag, asyncCb);
      }
      let self2 = this;
      let availInBefore = chunk && chunk.length;
      let availOutBefore = this._chunkSize - this._offset;
      let leftToInflate = this._maxLength;
      let inOff = 0;
      let buffers = [];
      let nread = 0;
      let error;
      this.on("error", function(err) {
        error = err;
      });
      function handleChunk(availInAfter, availOutAfter) {
        if (self2._hadError) {
          return;
        }
        let have = availOutBefore - availOutAfter;
        assert(have >= 0, "have should not go down");
        if (have > 0) {
          let out = self2._buffer.slice(self2._offset, self2._offset + have);
          self2._offset += have;
          if (out.length > leftToInflate) {
            out = out.slice(0, leftToInflate);
          }
          buffers.push(out);
          nread += out.length;
          leftToInflate -= out.length;
          if (leftToInflate === 0) {
            return false;
          }
        }
        if (availOutAfter === 0 || self2._offset >= self2._chunkSize) {
          availOutBefore = self2._chunkSize;
          self2._offset = 0;
          self2._buffer = Buffer.allocUnsafe(self2._chunkSize);
        }
        if (availOutAfter === 0) {
          inOff += availInBefore - availInAfter;
          availInBefore = availInAfter;
          return true;
        }
        return false;
      }
      assert(this._handle, "zlib binding closed");
      let res;
      do {
        res = this._handle.writeSync(
          flushFlag,
          chunk,
          // in
          inOff,
          // in_off
          availInBefore,
          // in_len
          this._buffer,
          // out
          this._offset,
          //out_off
          availOutBefore
        );
        res = res || this._writeState;
      } while (!this._hadError && handleChunk(res[0], res[1]));
      if (this._hadError) {
        throw error;
      }
      if (nread >= kMaxLength) {
        _close(this);
        throw new RangeError(
          "Cannot create final Buffer. It would be larger than 0x" + kMaxLength.toString(16) + " bytes"
        );
      }
      let buf = Buffer.concat(buffers, nread);
      _close(this);
      return buf;
    };
    util.inherits(Inflate, zlib.Inflate);
    function zlibBufferSync(engine, buffer) {
      if (typeof buffer === "string") {
        buffer = Buffer.from(buffer);
      }
      if (!(buffer instanceof Buffer)) {
        throw new TypeError("Not a string or buffer");
      }
      let flushFlag = engine._finishFlushFlag;
      if (flushFlag == null) {
        flushFlag = zlib.Z_FINISH;
      }
      return engine._processChunk(buffer, flushFlag);
    }
    function inflateSync(buffer, opts) {
      return zlibBufferSync(new Inflate(opts), buffer);
    }
    module.exports = exports = inflateSync;
    exports.Inflate = Inflate;
    exports.createInflate = createInflate;
    exports.inflateSync = inflateSync;
  }
});

// node_modules/pngjs/lib/sync-reader.js
var require_sync_reader = __commonJS({
  "node_modules/pngjs/lib/sync-reader.js"(exports, module) {
    "use strict";
    var SyncReader = module.exports = function(buffer) {
      this._buffer = buffer;
      this._reads = [];
    };
    SyncReader.prototype.read = function(length, callback) {
      this._reads.push({
        length: Math.abs(length),
        // if length < 0 then at most this length
        allowLess: length < 0,
        func: callback
      });
    };
    SyncReader.prototype.process = function() {
      while (this._reads.length > 0 && this._buffer.length) {
        let read = this._reads[0];
        if (this._buffer.length && (this._buffer.length >= read.length || read.allowLess)) {
          this._reads.shift();
          let buf = this._buffer;
          this._buffer = buf.slice(read.length);
          read.func.call(this, buf.slice(0, read.length));
        } else {
          break;
        }
      }
      if (this._reads.length > 0) {
        throw new Error("There are some read requests waitng on finished stream");
      }
      if (this._buffer.length > 0) {
        throw new Error("unrecognised content at end of stream");
      }
    };
  }
});

// node_modules/pngjs/lib/filter-parse-sync.js
var require_filter_parse_sync = __commonJS({
  "node_modules/pngjs/lib/filter-parse-sync.js"(exports) {
    "use strict";
    var SyncReader = require_sync_reader();
    var Filter = require_filter_parse();
    exports.process = function(inBuffer, bitmapInfo) {
      let outBuffers = [];
      let reader = new SyncReader(inBuffer);
      let filter = new Filter(bitmapInfo, {
        read: reader.read.bind(reader),
        write: function(bufferPart) {
          outBuffers.push(bufferPart);
        },
        complete: function() {
        }
      });
      filter.start();
      reader.process();
      return Buffer.concat(outBuffers);
    };
  }
});

// node_modules/pngjs/lib/parser-sync.js
var require_parser_sync = __commonJS({
  "node_modules/pngjs/lib/parser-sync.js"(exports, module) {
    "use strict";
    var hasSyncZlib = true;
    var zlib = __require("zlib");
    var inflateSync = require_sync_inflate();
    if (!zlib.deflateSync) {
      hasSyncZlib = false;
    }
    var SyncReader = require_sync_reader();
    var FilterSync = require_filter_parse_sync();
    var Parser = require_parser();
    var bitmapper = require_bitmapper();
    var formatNormaliser = require_format_normaliser();
    module.exports = function(buffer, options) {
      if (!hasSyncZlib) {
        throw new Error(
          "To use the sync capability of this library in old node versions, please pin pngjs to v2.3.0"
        );
      }
      let err;
      function handleError(_err_) {
        err = _err_;
      }
      let metaData;
      function handleMetaData(_metaData_) {
        metaData = _metaData_;
      }
      function handleTransColor(transColor) {
        metaData.transColor = transColor;
      }
      function handlePalette(palette) {
        metaData.palette = palette;
      }
      function handleSimpleTransparency() {
        metaData.alpha = true;
      }
      let gamma;
      function handleGamma(_gamma_) {
        gamma = _gamma_;
      }
      let inflateDataList = [];
      function handleInflateData(inflatedData2) {
        inflateDataList.push(inflatedData2);
      }
      let reader = new SyncReader(buffer);
      let parser = new Parser(options, {
        read: reader.read.bind(reader),
        error: handleError,
        metadata: handleMetaData,
        gamma: handleGamma,
        palette: handlePalette,
        transColor: handleTransColor,
        inflateData: handleInflateData,
        simpleTransparency: handleSimpleTransparency
      });
      parser.start();
      reader.process();
      if (err) {
        throw err;
      }
      let inflateData = Buffer.concat(inflateDataList);
      inflateDataList.length = 0;
      let inflatedData;
      if (metaData.interlace) {
        inflatedData = zlib.inflateSync(inflateData);
      } else {
        let rowSize = (metaData.width * metaData.bpp * metaData.depth + 7 >> 3) + 1;
        let imageSize = rowSize * metaData.height;
        inflatedData = inflateSync(inflateData, {
          chunkSize: imageSize,
          maxLength: imageSize
        });
      }
      inflateData = null;
      if (!inflatedData || !inflatedData.length) {
        throw new Error("bad png - invalid inflate data response");
      }
      let unfilteredData = FilterSync.process(inflatedData, metaData);
      inflateData = null;
      let bitmapData = bitmapper.dataToBitMap(unfilteredData, metaData);
      unfilteredData = null;
      let normalisedBitmapData = formatNormaliser(
        bitmapData,
        metaData,
        options.skipRescale
      );
      metaData.data = normalisedBitmapData;
      metaData.gamma = gamma || 0;
      return metaData;
    };
  }
});

// node_modules/pngjs/lib/packer-sync.js
var require_packer_sync = __commonJS({
  "node_modules/pngjs/lib/packer-sync.js"(exports, module) {
    "use strict";
    var hasSyncZlib = true;
    var zlib = __require("zlib");
    if (!zlib.deflateSync) {
      hasSyncZlib = false;
    }
    var constants = require_constants();
    var Packer = require_packer();
    module.exports = function(metaData, opt) {
      if (!hasSyncZlib) {
        throw new Error(
          "To use the sync capability of this library in old node versions, please pin pngjs to v2.3.0"
        );
      }
      let options = opt || {};
      let packer = new Packer(options);
      let chunks = [];
      chunks.push(Buffer.from(constants.PNG_SIGNATURE));
      chunks.push(packer.packIHDR(metaData.width, metaData.height));
      if (metaData.gamma) {
        chunks.push(packer.packGAMA(metaData.gamma));
      }
      let filteredData = packer.filterData(
        metaData.data,
        metaData.width,
        metaData.height
      );
      let compressedData = zlib.deflateSync(
        filteredData,
        packer.getDeflateOptions()
      );
      filteredData = null;
      if (!compressedData || !compressedData.length) {
        throw new Error("bad png - invalid compressed data response");
      }
      chunks.push(packer.packIDAT(compressedData));
      chunks.push(packer.packIEND());
      return Buffer.concat(chunks);
    };
  }
});

// node_modules/pngjs/lib/png-sync.js
var require_png_sync = __commonJS({
  "node_modules/pngjs/lib/png-sync.js"(exports) {
    "use strict";
    var parse = require_parser_sync();
    var pack = require_packer_sync();
    exports.read = function(buffer, options) {
      return parse(buffer, options || {});
    };
    exports.write = function(png, options) {
      return pack(png, options);
    };
  }
});

// node_modules/pngjs/lib/png.js
var require_png = __commonJS({
  "node_modules/pngjs/lib/png.js"(exports) {
    "use strict";
    var util = __require("util");
    var Stream = __require("stream");
    var Parser = require_parser_async();
    var Packer = require_packer_async();
    var PNGSync = require_png_sync();
    var PNG2 = exports.PNG = function(options) {
      Stream.call(this);
      options = options || {};
      this.width = options.width | 0;
      this.height = options.height | 0;
      this.data = this.width > 0 && this.height > 0 ? Buffer.alloc(4 * this.width * this.height) : null;
      if (options.fill && this.data) {
        this.data.fill(0);
      }
      this.gamma = 0;
      this.readable = this.writable = true;
      this._parser = new Parser(options);
      this._parser.on("error", this.emit.bind(this, "error"));
      this._parser.on("close", this._handleClose.bind(this));
      this._parser.on("metadata", this._metadata.bind(this));
      this._parser.on("gamma", this._gamma.bind(this));
      this._parser.on(
        "parsed",
        function(data) {
          this.data = data;
          this.emit("parsed", data);
        }.bind(this)
      );
      this._packer = new Packer(options);
      this._packer.on("data", this.emit.bind(this, "data"));
      this._packer.on("end", this.emit.bind(this, "end"));
      this._parser.on("close", this._handleClose.bind(this));
      this._packer.on("error", this.emit.bind(this, "error"));
    };
    util.inherits(PNG2, Stream);
    PNG2.sync = PNGSync;
    PNG2.prototype.pack = function() {
      if (!this.data || !this.data.length) {
        this.emit("error", "No data provided");
        return this;
      }
      process.nextTick(
        function() {
          this._packer.pack(this.data, this.width, this.height, this.gamma);
        }.bind(this)
      );
      return this;
    };
    PNG2.prototype.parse = function(data, callback) {
      if (callback) {
        let onParsed, onError;
        onParsed = function(parsedData) {
          this.removeListener("error", onError);
          this.data = parsedData;
          callback(null, this);
        }.bind(this);
        onError = function(err) {
          this.removeListener("parsed", onParsed);
          callback(err, null);
        }.bind(this);
        this.once("parsed", onParsed);
        this.once("error", onError);
      }
      this.end(data);
      return this;
    };
    PNG2.prototype.write = function(data) {
      this._parser.write(data);
      return true;
    };
    PNG2.prototype.end = function(data) {
      this._parser.end(data);
    };
    PNG2.prototype._metadata = function(metadata) {
      this.width = metadata.width;
      this.height = metadata.height;
      this.emit("metadata", metadata);
    };
    PNG2.prototype._gamma = function(gamma) {
      this.gamma = gamma;
    };
    PNG2.prototype._handleClose = function() {
      if (!this._parser.writable && !this._packer.readable) {
        this.emit("close");
      }
    };
    PNG2.bitblt = function(src, dst, srcX, srcY, width, height, deltaX, deltaY) {
      srcX |= 0;
      srcY |= 0;
      width |= 0;
      height |= 0;
      deltaX |= 0;
      deltaY |= 0;
      if (srcX > src.width || srcY > src.height || srcX + width > src.width || srcY + height > src.height) {
        throw new Error("bitblt reading outside image");
      }
      if (deltaX > dst.width || deltaY > dst.height || deltaX + width > dst.width || deltaY + height > dst.height) {
        throw new Error("bitblt writing outside image");
      }
      for (let y = 0; y < height; y++) {
        src.data.copy(
          dst.data,
          (deltaY + y) * dst.width + deltaX << 2,
          (srcY + y) * src.width + srcX << 2,
          (srcY + y) * src.width + srcX + width << 2
        );
      }
    };
    PNG2.prototype.bitblt = function(dst, srcX, srcY, width, height, deltaX, deltaY) {
      PNG2.bitblt(this, dst, srcX, srcY, width, height, deltaX, deltaY);
      return this;
    };
    PNG2.adjustGamma = function(src) {
      if (src.gamma) {
        for (let y = 0; y < src.height; y++) {
          for (let x = 0; x < src.width; x++) {
            let idx = src.width * y + x << 2;
            for (let i = 0; i < 3; i++) {
              let sample = src.data[idx + i] / 255;
              sample = Math.pow(sample, 1 / 2.2 / src.gamma);
              src.data[idx + i] = Math.round(sample * 255);
            }
          }
        }
        src.gamma = 0;
      }
    };
    PNG2.prototype.adjustGamma = function() {
      PNG2.adjustGamma(this);
    };
  }
});

// src/cli.ts
import { readFile as readFile13 } from "node:fs/promises";
import path17 from "node:path";
import { randomUUID as randomUUID12 } from "node:crypto";

// src/art.ts
import { mkdir as mkdir3, readFile as readFile9, rename as rename2, rm, stat as stat3, writeFile as writeFile3 } from "node:fs/promises";
import { createHash as createHash5, randomUUID as randomUUID6 } from "node:crypto";
import path10 from "node:path";

// src/pending.ts
import { createHash } from "node:crypto";
function pendingFor(state, id) {
  const pending = state.pending;
  if (!pending || pending.id !== id || !state.pet || pending.petId !== state.pet.id || pending.baseRevision !== state.pet.revision)
    throw new Error("Stale story operation; read the persisted record before continuing");
  return pending;
}
function requestId(state) {
  const pending = state.pending;
  if (!pending?.plan) return null;
  return createHash("sha256").update(JSON.stringify([pending.id, pending.petId, pending.baseRevision, pending.plan])).digest("hex").slice(0, 24);
}

// src/appearance.ts
function appearanceFor(state, stage, id) {
  const art = state.art.find(
    (art2) => art2.id === id && art2.petId === state.pet.id && art2.kind === "atlas" && art2.stage === stage
  );
  if (!art)
    throw new Error("Reusable appearance is missing, belongs to another pet, or is incompatible with this host/stage");
  return art;
}
function desiredAppearance(state) {
  const plan = state.pending?.plan;
  if (!plan?.appearance) return state.art.find((art) => art.id === state.pet?.state.appearanceId);
  if (plan.appearance.reuseArtId) return appearanceFor(state, plan.stage, plan.appearance.reuseArtId);
  const current = requestId(state);
  return state.art.findLast((art) => art.petId === state.pet?.id && art.requestId === current && art.kind === "atlas");
}

// src/config.ts
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
var here = path.dirname(fileURLToPath(import.meta.url));
function pluginRoot() {
  const candidates = [path.resolve(here, ".."), path.resolve(here, "..", "plugins", "genpet")];
  return candidates.find((dir) => existsSync(path.join(dir, ".codex-plugin", "plugin.json"))) ?? candidates[0];
}
function packageHost() {
  const file = path.join(pluginRoot(), "config", "host.json");
  const host2 = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")).host : "desktop";
  if (!["desktop", "cloud"].includes(host2)) throw new Error("Invalid package host");
  return host2;
}
var dataRoot = () => process.env.GENPET_DATA_DIR || path.join(homedir(), ".genpet");
var codexHome = () => process.env.CODEX_HOME || path.join(homedir(), ".codex");
function readPromptFile(fileName) {
  const candidates = [
    path.resolve(here, "..", "framework", "prompts", fileName),
    path.join(pluginRoot(), "prompts", fileName)
  ];
  const file = candidates.find(existsSync);
  if (!file) throw new Error(`Missing prompt file: ${fileName}`);
  return readFileSync(file, "utf8");
}
function readPrompt(name2) {
  if (!/^[a-zA-Z][a-zA-Z0-9-]*$/.test(name2)) throw new Error("Invalid prompt module");
  return readPromptFile(`${name2}.md`);
}
function readUnits() {
  return JSON.parse(readPromptFile("units.json")).units;
}

// src/hosts/desktop/atlas.ts
var ATLAS = { width: 1536, height: 2288, columns: 8, rows: 11, cellWidth: 192, cellHeight: 208 };
var ATLAS_CONTRACT = {
  columns: ATLAS.columns,
  cellWidth: ATLAS.cellWidth,
  cellHeight: ATLAS.cellHeight,
  rows: ATLAS.rows,
  spriteVersionNumber: 2
};
var actions = [
  { name: "idle", row: 0, count: 6, durations: [280, 110, 110, 140, 140, 320] },
  { name: "running-right", row: 1, count: 8, durations: [120, 120, 120, 120, 120, 120, 120, 220] },
  { name: "running-left", row: 2, count: 8, durations: [120, 120, 120, 120, 120, 120, 120, 220] },
  { name: "waving", row: 3, count: 4, durations: [140, 140, 140, 280] },
  { name: "jumping", row: 4, count: 5, durations: [140, 140, 140, 140, 280] },
  { name: "failed", row: 5, count: 8, durations: [140, 140, 140, 140, 140, 140, 140, 240] },
  { name: "waiting", row: 6, count: 6, durations: [150, 150, 150, 150, 150, 260] },
  { name: "running", row: 7, count: 6, durations: [120, 120, 120, 120, 120, 220] },
  { name: "review", row: 8, count: 6, durations: [150, 150, 150, 150, 150, 280] }
];
function checkAtlas(image) {
  if (image.width !== ATLAS.width || image.height !== ATLAS.height) throw new Error("Atlas must be 1536 \xD7 2288 (v2)");
  const { cellWidth: w, cellHeight: h } = ATLAS;
  for (let row = 0; row < ATLAS.rows; row++)
    for (let col = 0; col < ATLAS.columns; col++) {
      const used = col < (row < actions.length ? actions[row].count : ATLAS.columns) || row === 0 && col === 6;
      let visible = 0;
      for (let y = row * h; y < (row + 1) * h; y++)
        for (let x = col * w; x < (col + 1) * w; x++) if (image.data[(y * image.width + x) * 4 + 3] > 0) visible++;
      if (used && visible < 30) throw new Error(`Empty animation cell ${row},${col}`);
      if (!used && visible > 0) throw new Error(`Unused cell ${row},${col} must be transparent`);
    }
}

// src/hosts/desktop/publish.ts
import { copyFile, mkdir, readFile as readFile6, rename, writeFile } from "node:fs/promises";
import { createHash as createHash4, randomUUID as randomUUID4 } from "node:crypto";
import path7 from "node:path";

// src/status.ts
var RECENT = { stories: 5, art: 30, chats: 10 };
function briefForPet(pet) {
  return JSON.stringify({
    id: pet.id,
    name: pet.name,
    soul: {
      genes: pet.soul.genes,
      ...pet.soul.personality ? { personality: pet.soul.personality } : {},
      ...pet.soul.acquisition ? { acquisition: { place: pet.soul.acquisition.place, connection: pet.soul.acquisition.connection } } : {}
    },
    memory: pet.memory.text,
    state: {
      stage: pet.state.stage,
      description: pet.state.description,
      ...pet.state.home ? { home: pet.state.home } : {},
      ...pet.state.special && pet.state.special.endedAt === void 0 ? { special: pet.state.special.description } : {}
    }
  });
}
function cloudBriefForPet(pet, draft) {
  const source = briefForPet(pet);
  if (draft !== void 0) {
    if (!draft || draft.petId !== pet.id || draft.revision !== pet.revision)
      throw new Error("Brief draft must match the current Pet ID and revision");
    if (typeof draft.description !== "string" || !draft.description.trim() || [...draft.description].length > 500)
      throw new Error("Cloud Pet description must contain at most 500 characters");
  }
  const description = draft?.description ?? ([...source].length <= 500 ? source : null);
  return {
    petId: pet.id,
    revision: pet.revision,
    sourceBrief: JSON.parse(source),
    description,
    maxDescriptionLength: 500,
    needsSummary: description === null
  };
}
function statusView(state) {
  const chats = state.chats ?? [];
  const pending = state.pending ? (({ steps, ...record2 }) => record2)(state.pending) : null;
  return {
    version: state.version,
    host: state.host,
    pet: state.pet,
    pending,
    ...state.schedule ? { schedule: state.schedule } : {},
    ...state.legacy ? { legacy: state.legacy } : {},
    ...state.needsImport ? { needsImport: true, legacyFile: state.legacyFile } : {},
    ...state.handoff ? { handoff: state.handoff } : {},
    storyCount: state.stories.length,
    stories: state.stories.slice(-RECENT.stories).map(({ steps, hostResult: hostResult2, ...story }) => story),
    artCount: state.art.length,
    art: state.art.slice(-RECENT.art).map(({ id, stage, kind, description, file }) => ({ id, stage, kind, description, file })),
    chatCount: chats.length,
    chats: chats.slice(-RECENT.chats).map(({ at, text: text2 }) => ({ at, text: text2 }))
  };
}

// src/hosts/art.ts
import { stat } from "node:fs/promises";

// src/image.ts
var import_pngjs = __toESM(require_png(), 1);
import { readFile } from "node:fs/promises";
import { existsSync as existsSync2, readFileSync as readFileSync2 } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath as fileURLToPath2 } from "node:url";

// node_modules/@jsquash/webp/codec/dec/webp_dec.js
var Module = (() => {
  var _scriptDir = import.meta.url;
  return (function(Module2 = {}) {
    var Module2 = typeof Module2 != "undefined" ? Module2 : {};
    var readyPromiseResolve, readyPromiseReject;
    Module2["ready"] = new Promise(function(resolve, reject) {
      readyPromiseResolve = resolve;
      readyPromiseReject = reject;
    });
    const isServiceWorker = globalThis.ServiceWorkerGlobalScope !== void 0;
    const isRunningInCloudFlareWorkers = isServiceWorker && typeof self !== "undefined" && globalThis.caches && globalThis.caches.default !== void 0;
    const isRunningInNode = typeof process === "object" && process.release && process.release.name === "node";
    if (isRunningInCloudFlareWorkers || isRunningInNode) {
      if (!globalThis.ImageData) {
        globalThis.ImageData = class ImageData {
          constructor(data, width, height) {
            this.data = data;
            this.width = width;
            this.height = height;
          }
        };
      }
      if (import.meta.url === void 0) {
        import.meta.url = "https://localhost";
      }
      if (typeof self !== "undefined" && self.location === void 0) {
        self.location = { href: "" };
      }
    }
    var moduleOverrides = Object.assign({}, Module2);
    var arguments_ = [];
    var thisProgram = "./this.program";
    var quit_ = (status, toThrow) => {
      throw toThrow;
    };
    var ENVIRONMENT_IS_WEB = typeof window == "object";
    var ENVIRONMENT_IS_WORKER = typeof importScripts == "function";
    var ENVIRONMENT_IS_NODE = typeof process == "object" && typeof process.versions == "object" && typeof process.versions.node == "string";
    var scriptDirectory = "";
    function locateFile(path18) {
      if (Module2["locateFile"]) {
        return Module2["locateFile"](path18, scriptDirectory);
      }
      return scriptDirectory + path18;
    }
    var read_, readAsync, readBinary, setWindowTitle;
    if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
      if (ENVIRONMENT_IS_WORKER) {
        scriptDirectory = self.location.href;
      } else if (typeof document != "undefined" && document.currentScript) {
        scriptDirectory = document.currentScript.src;
      }
      if (_scriptDir) {
        scriptDirectory = _scriptDir;
      }
      if (scriptDirectory.indexOf("blob:") !== 0) {
        scriptDirectory = scriptDirectory.substr(0, scriptDirectory.replace(/[?#].*/, "").lastIndexOf("/") + 1);
      } else {
        scriptDirectory = "";
      }
      {
        read_ = (url) => {
          var xhr = new XMLHttpRequest();
          xhr.open("GET", url, false);
          xhr.send(null);
          return xhr.responseText;
        };
        if (ENVIRONMENT_IS_WORKER) {
          readBinary = (url) => {
            var xhr = new XMLHttpRequest();
            xhr.open("GET", url, false);
            xhr.responseType = "arraybuffer";
            xhr.send(null);
            return new Uint8Array(xhr.response);
          };
        }
        readAsync = (url, onload, onerror) => {
          var xhr = new XMLHttpRequest();
          xhr.open("GET", url, true);
          xhr.responseType = "arraybuffer";
          xhr.onload = () => {
            if (xhr.status == 200 || xhr.status == 0 && xhr.response) {
              onload(xhr.response);
              return;
            }
            onerror();
          };
          xhr.onerror = onerror;
          xhr.send(null);
        };
      }
      setWindowTitle = (title) => document.title = title;
    } else {
    }
    var out = Module2["print"] || console.log.bind(console);
    var err = Module2["printErr"] || console.warn.bind(console);
    Object.assign(Module2, moduleOverrides);
    moduleOverrides = null;
    if (Module2["arguments"]) arguments_ = Module2["arguments"];
    if (Module2["thisProgram"]) thisProgram = Module2["thisProgram"];
    if (Module2["quit"]) quit_ = Module2["quit"];
    var wasmBinary;
    if (Module2["wasmBinary"]) wasmBinary = Module2["wasmBinary"];
    var noExitRuntime = Module2["noExitRuntime"] || true;
    if (typeof WebAssembly != "object") {
      abort("no native wasm support detected");
    }
    var wasmMemory;
    var ABORT = false;
    var EXITSTATUS;
    function UTF8ArrayToString(heapOrArray, idx, maxBytesToRead) {
      var endIdx = idx + maxBytesToRead;
      var str = "";
      while (!(idx >= endIdx)) {
        var u0 = heapOrArray[idx++];
        if (!u0) return str;
        if (!(u0 & 128)) {
          str += String.fromCharCode(u0);
          continue;
        }
        var u1 = heapOrArray[idx++] & 63;
        if ((u0 & 224) == 192) {
          str += String.fromCharCode((u0 & 31) << 6 | u1);
          continue;
        }
        var u2 = heapOrArray[idx++] & 63;
        if ((u0 & 240) == 224) {
          u0 = (u0 & 15) << 12 | u1 << 6 | u2;
        } else {
          u0 = (u0 & 7) << 18 | u1 << 12 | u2 << 6 | heapOrArray[idx++] & 63;
        }
        if (u0 < 65536) {
          str += String.fromCharCode(u0);
        } else {
          var ch = u0 - 65536;
          str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023);
        }
      }
      return str;
    }
    function UTF8ToString(ptr, maxBytesToRead) {
      return ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead) : "";
    }
    function stringToUTF8Array(str, heap, outIdx, maxBytesToWrite) {
      if (!(maxBytesToWrite > 0)) return 0;
      var startIdx = outIdx;
      var endIdx = outIdx + maxBytesToWrite - 1;
      for (var i = 0; i < str.length; ++i) {
        var u = str.charCodeAt(i);
        if (u >= 55296 && u <= 57343) {
          var u1 = str.charCodeAt(++i);
          u = 65536 + ((u & 1023) << 10) | u1 & 1023;
        }
        if (u <= 127) {
          if (outIdx >= endIdx) break;
          heap[outIdx++] = u;
        } else if (u <= 2047) {
          if (outIdx + 1 >= endIdx) break;
          heap[outIdx++] = 192 | u >> 6;
          heap[outIdx++] = 128 | u & 63;
        } else if (u <= 65535) {
          if (outIdx + 2 >= endIdx) break;
          heap[outIdx++] = 224 | u >> 12;
          heap[outIdx++] = 128 | u >> 6 & 63;
          heap[outIdx++] = 128 | u & 63;
        } else {
          if (outIdx + 3 >= endIdx) break;
          heap[outIdx++] = 240 | u >> 18;
          heap[outIdx++] = 128 | u >> 12 & 63;
          heap[outIdx++] = 128 | u >> 6 & 63;
          heap[outIdx++] = 128 | u & 63;
        }
      }
      heap[outIdx] = 0;
      return outIdx - startIdx;
    }
    function stringToUTF8(str, outPtr, maxBytesToWrite) {
      return stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite);
    }
    function lengthBytesUTF8(str) {
      var len = 0;
      for (var i = 0; i < str.length; ++i) {
        var c = str.charCodeAt(i);
        if (c <= 127) {
          len++;
        } else if (c <= 2047) {
          len += 2;
        } else if (c >= 55296 && c <= 57343) {
          len += 4;
          ++i;
        } else {
          len += 3;
        }
      }
      return len;
    }
    var HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;
    function updateMemoryViews() {
      var b = wasmMemory.buffer;
      Module2["HEAP8"] = HEAP8 = new Int8Array(b);
      Module2["HEAP16"] = HEAP16 = new Int16Array(b);
      Module2["HEAP32"] = HEAP32 = new Int32Array(b);
      Module2["HEAPU8"] = HEAPU8 = new Uint8Array(b);
      Module2["HEAPU16"] = HEAPU16 = new Uint16Array(b);
      Module2["HEAPU32"] = HEAPU32 = new Uint32Array(b);
      Module2["HEAPF32"] = HEAPF32 = new Float32Array(b);
      Module2["HEAPF64"] = HEAPF64 = new Float64Array(b);
    }
    var wasmTable;
    var __ATPRERUN__ = [];
    var __ATINIT__ = [];
    var __ATPOSTRUN__ = [];
    var runtimeInitialized = false;
    function preRun() {
      if (Module2["preRun"]) {
        if (typeof Module2["preRun"] == "function") Module2["preRun"] = [Module2["preRun"]];
        while (Module2["preRun"].length) {
          addOnPreRun(Module2["preRun"].shift());
        }
      }
      callRuntimeCallbacks(__ATPRERUN__);
    }
    function initRuntime() {
      runtimeInitialized = true;
      callRuntimeCallbacks(__ATINIT__);
    }
    function postRun() {
      if (Module2["postRun"]) {
        if (typeof Module2["postRun"] == "function") Module2["postRun"] = [Module2["postRun"]];
        while (Module2["postRun"].length) {
          addOnPostRun(Module2["postRun"].shift());
        }
      }
      callRuntimeCallbacks(__ATPOSTRUN__);
    }
    function addOnPreRun(cb) {
      __ATPRERUN__.unshift(cb);
    }
    function addOnInit(cb) {
      __ATINIT__.unshift(cb);
    }
    function addOnPostRun(cb) {
      __ATPOSTRUN__.unshift(cb);
    }
    var runDependencies = 0;
    var runDependencyWatcher = null;
    var dependenciesFulfilled = null;
    function addRunDependency(id) {
      runDependencies++;
      if (Module2["monitorRunDependencies"]) {
        Module2["monitorRunDependencies"](runDependencies);
      }
    }
    function removeRunDependency(id) {
      runDependencies--;
      if (Module2["monitorRunDependencies"]) {
        Module2["monitorRunDependencies"](runDependencies);
      }
      if (runDependencies == 0) {
        if (runDependencyWatcher !== null) {
          clearInterval(runDependencyWatcher);
          runDependencyWatcher = null;
        }
        if (dependenciesFulfilled) {
          var callback = dependenciesFulfilled;
          dependenciesFulfilled = null;
          callback();
        }
      }
    }
    function abort(what) {
      if (Module2["onAbort"]) {
        Module2["onAbort"](what);
      }
      what = "Aborted(" + what + ")";
      err(what);
      ABORT = true;
      EXITSTATUS = 1;
      what += ". Build with -sASSERTIONS for more info.";
      var e = new WebAssembly.RuntimeError(what);
      readyPromiseReject(e);
      throw e;
    }
    var dataURIPrefix = "data:application/octet-stream;base64,";
    function isDataURI(filename) {
      return filename.startsWith(dataURIPrefix);
    }
    var wasmBinaryFile;
    if (Module2["locateFile"]) {
      wasmBinaryFile = "webp_dec.wasm";
      if (!isDataURI(wasmBinaryFile)) {
        wasmBinaryFile = locateFile(wasmBinaryFile);
      }
    } else {
      wasmBinaryFile = new URL("webp_dec.wasm", import.meta.url).href;
    }
    function getBinary(file) {
      try {
        if (file == wasmBinaryFile && wasmBinary) {
          return new Uint8Array(wasmBinary);
        }
        if (readBinary) {
          return readBinary(file);
        }
        throw "both async and sync fetching of the wasm failed";
      } catch (err2) {
        abort(err2);
      }
    }
    function getBinaryPromise(binaryFile) {
      if (!wasmBinary && (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER)) {
        if (typeof fetch == "function") {
          return fetch(binaryFile, { credentials: "same-origin" }).then(function(response) {
            if (!response["ok"]) {
              throw "failed to load wasm binary file at '" + binaryFile + "'";
            }
            return response["arrayBuffer"]();
          }).catch(function() {
            return getBinary(binaryFile);
          });
        }
      }
      return Promise.resolve().then(function() {
        return getBinary(binaryFile);
      });
    }
    function instantiateArrayBuffer(binaryFile, imports, receiver) {
      return getBinaryPromise(binaryFile).then(function(binary) {
        return WebAssembly.instantiate(binary, imports);
      }).then(function(instance) {
        return instance;
      }).then(receiver, function(reason) {
        err("failed to asynchronously prepare wasm: " + reason);
        abort(reason);
      });
    }
    function instantiateAsync(binary, binaryFile, imports, callback) {
      if (!binary && typeof WebAssembly.instantiateStreaming == "function" && !isDataURI(binaryFile) && typeof fetch == "function") {
        return fetch(binaryFile, { credentials: "same-origin" }).then(function(response) {
          var result = WebAssembly.instantiateStreaming(response, imports);
          return result.then(callback, function(reason) {
            err("wasm streaming compile failed: " + reason);
            err("falling back to ArrayBuffer instantiation");
            return instantiateArrayBuffer(binaryFile, imports, callback);
          });
        });
      } else {
        return instantiateArrayBuffer(binaryFile, imports, callback);
      }
    }
    function createWasm() {
      var info = { "a": wasmImports };
      function receiveInstance(instance, module) {
        var exports = instance.exports;
        Module2["asm"] = exports;
        wasmMemory = Module2["asm"]["s"];
        updateMemoryViews();
        wasmTable = Module2["asm"]["y"];
        addOnInit(Module2["asm"]["t"]);
        removeRunDependency("wasm-instantiate");
        return exports;
      }
      addRunDependency("wasm-instantiate");
      function receiveInstantiationResult(result) {
        receiveInstance(result["instance"]);
      }
      if (Module2["instantiateWasm"]) {
        try {
          return Module2["instantiateWasm"](info, receiveInstance);
        } catch (e) {
          err("Module.instantiateWasm callback failed with error: " + e);
          readyPromiseReject(e);
        }
      }
      instantiateAsync(wasmBinary, wasmBinaryFile, info, receiveInstantiationResult).catch(readyPromiseReject);
      return {};
    }
    function callRuntimeCallbacks(callbacks) {
      while (callbacks.length > 0) {
        callbacks.shift()(Module2);
      }
    }
    function ExceptionInfo(excPtr) {
      this.excPtr = excPtr;
      this.ptr = excPtr - 24;
      this.set_type = function(type) {
        HEAPU32[this.ptr + 4 >> 2] = type;
      };
      this.get_type = function() {
        return HEAPU32[this.ptr + 4 >> 2];
      };
      this.set_destructor = function(destructor) {
        HEAPU32[this.ptr + 8 >> 2] = destructor;
      };
      this.get_destructor = function() {
        return HEAPU32[this.ptr + 8 >> 2];
      };
      this.set_refcount = function(refcount) {
        HEAP32[this.ptr >> 2] = refcount;
      };
      this.set_caught = function(caught) {
        caught = caught ? 1 : 0;
        HEAP8[this.ptr + 12 >> 0] = caught;
      };
      this.get_caught = function() {
        return HEAP8[this.ptr + 12 >> 0] != 0;
      };
      this.set_rethrown = function(rethrown) {
        rethrown = rethrown ? 1 : 0;
        HEAP8[this.ptr + 13 >> 0] = rethrown;
      };
      this.get_rethrown = function() {
        return HEAP8[this.ptr + 13 >> 0] != 0;
      };
      this.init = function(type, destructor) {
        this.set_adjusted_ptr(0);
        this.set_type(type);
        this.set_destructor(destructor);
        this.set_refcount(0);
        this.set_caught(false);
        this.set_rethrown(false);
      };
      this.add_ref = function() {
        var value = HEAP32[this.ptr >> 2];
        HEAP32[this.ptr >> 2] = value + 1;
      };
      this.release_ref = function() {
        var prev = HEAP32[this.ptr >> 2];
        HEAP32[this.ptr >> 2] = prev - 1;
        return prev === 1;
      };
      this.set_adjusted_ptr = function(adjustedPtr) {
        HEAPU32[this.ptr + 16 >> 2] = adjustedPtr;
      };
      this.get_adjusted_ptr = function() {
        return HEAPU32[this.ptr + 16 >> 2];
      };
      this.get_exception_ptr = function() {
        var isPointer = ___cxa_is_pointer_type(this.get_type());
        if (isPointer) {
          return HEAPU32[this.excPtr >> 2];
        }
        var adjusted = this.get_adjusted_ptr();
        if (adjusted !== 0) return adjusted;
        return this.excPtr;
      };
    }
    var exceptionLast = 0;
    var uncaughtExceptionCount = 0;
    function ___cxa_throw(ptr, type, destructor) {
      var info = new ExceptionInfo(ptr);
      info.init(type, destructor);
      exceptionLast = ptr;
      uncaughtExceptionCount++;
      throw ptr;
    }
    function __embind_register_bigint(primitiveType, name2, size, minRange, maxRange) {
    }
    function getShiftFromSize(size) {
      switch (size) {
        case 1:
          return 0;
        case 2:
          return 1;
        case 4:
          return 2;
        case 8:
          return 3;
        default:
          throw new TypeError("Unknown type size: " + size);
      }
    }
    function embind_init_charCodes() {
      var codes = new Array(256);
      for (var i = 0; i < 256; ++i) {
        codes[i] = String.fromCharCode(i);
      }
      embind_charCodes = codes;
    }
    var embind_charCodes = void 0;
    function readLatin1String(ptr) {
      var ret = "";
      var c = ptr;
      while (HEAPU8[c]) {
        ret += embind_charCodes[HEAPU8[c++]];
      }
      return ret;
    }
    var awaitingDependencies = {};
    var registeredTypes = {};
    var typeDependencies = {};
    var char_0 = 48;
    var char_9 = 57;
    function makeLegalFunctionName(name2) {
      if (void 0 === name2) {
        return "_unknown";
      }
      name2 = name2.replace(/[^a-zA-Z0-9_]/g, "$");
      var f = name2.charCodeAt(0);
      if (f >= char_0 && f <= char_9) {
        return "_" + name2;
      }
      return name2;
    }
    function createNamedFunction(name2, body) {
      name2 = makeLegalFunctionName(name2);
      return { [name2]: function() {
        return body.apply(this, arguments);
      } }[name2];
    }
    function extendError(baseErrorType, errorName) {
      var errorClass = createNamedFunction(errorName, function(message) {
        this.name = errorName;
        this.message = message;
        var stack = new Error(message).stack;
        if (stack !== void 0) {
          this.stack = this.toString() + "\n" + stack.replace(/^Error(:[^\n]*)?\n/, "");
        }
      });
      errorClass.prototype = Object.create(baseErrorType.prototype);
      errorClass.prototype.constructor = errorClass;
      errorClass.prototype.toString = function() {
        if (this.message === void 0) {
          return this.name;
        } else {
          return this.name + ": " + this.message;
        }
      };
      return errorClass;
    }
    var BindingError = void 0;
    function throwBindingError(message) {
      throw new BindingError(message);
    }
    var InternalError = void 0;
    function throwInternalError(message) {
      throw new InternalError(message);
    }
    function whenDependentTypesAreResolved(myTypes, dependentTypes, getTypeConverters) {
      myTypes.forEach(function(type) {
        typeDependencies[type] = dependentTypes;
      });
      function onComplete(typeConverters2) {
        var myTypeConverters = getTypeConverters(typeConverters2);
        if (myTypeConverters.length !== myTypes.length) {
          throwInternalError("Mismatched type converter count");
        }
        for (var i = 0; i < myTypes.length; ++i) {
          registerType(myTypes[i], myTypeConverters[i]);
        }
      }
      var typeConverters = new Array(dependentTypes.length);
      var unregisteredTypes = [];
      var registered = 0;
      dependentTypes.forEach((dt, i) => {
        if (registeredTypes.hasOwnProperty(dt)) {
          typeConverters[i] = registeredTypes[dt];
        } else {
          unregisteredTypes.push(dt);
          if (!awaitingDependencies.hasOwnProperty(dt)) {
            awaitingDependencies[dt] = [];
          }
          awaitingDependencies[dt].push(() => {
            typeConverters[i] = registeredTypes[dt];
            ++registered;
            if (registered === unregisteredTypes.length) {
              onComplete(typeConverters);
            }
          });
        }
      });
      if (0 === unregisteredTypes.length) {
        onComplete(typeConverters);
      }
    }
    function registerType(rawType, registeredInstance, options = {}) {
      if (!("argPackAdvance" in registeredInstance)) {
        throw new TypeError("registerType registeredInstance requires argPackAdvance");
      }
      var name2 = registeredInstance.name;
      if (!rawType) {
        throwBindingError('type "' + name2 + '" must have a positive integer typeid pointer');
      }
      if (registeredTypes.hasOwnProperty(rawType)) {
        if (options.ignoreDuplicateRegistrations) {
          return;
        } else {
          throwBindingError("Cannot register type '" + name2 + "' twice");
        }
      }
      registeredTypes[rawType] = registeredInstance;
      delete typeDependencies[rawType];
      if (awaitingDependencies.hasOwnProperty(rawType)) {
        var callbacks = awaitingDependencies[rawType];
        delete awaitingDependencies[rawType];
        callbacks.forEach((cb) => cb());
      }
    }
    function __embind_register_bool(rawType, name2, size, trueValue, falseValue) {
      var shift = getShiftFromSize(size);
      name2 = readLatin1String(name2);
      registerType(rawType, { name: name2, "fromWireType": function(wt) {
        return !!wt;
      }, "toWireType": function(destructors, o) {
        return o ? trueValue : falseValue;
      }, "argPackAdvance": 8, "readValueFromPointer": function(pointer) {
        var heap;
        if (size === 1) {
          heap = HEAP8;
        } else if (size === 2) {
          heap = HEAP16;
        } else if (size === 4) {
          heap = HEAP32;
        } else {
          throw new TypeError("Unknown boolean type size: " + name2);
        }
        return this["fromWireType"](heap[pointer >> shift]);
      }, destructorFunction: null });
    }
    var emval_free_list = [];
    var emval_handle_array = [{}, { value: void 0 }, { value: null }, { value: true }, { value: false }];
    function __emval_decref(handle) {
      if (handle > 4 && 0 === --emval_handle_array[handle].refcount) {
        emval_handle_array[handle] = void 0;
        emval_free_list.push(handle);
      }
    }
    function count_emval_handles() {
      var count = 0;
      for (var i = 5; i < emval_handle_array.length; ++i) {
        if (emval_handle_array[i] !== void 0) {
          ++count;
        }
      }
      return count;
    }
    function get_first_emval() {
      for (var i = 5; i < emval_handle_array.length; ++i) {
        if (emval_handle_array[i] !== void 0) {
          return emval_handle_array[i];
        }
      }
      return null;
    }
    function init_emval() {
      Module2["count_emval_handles"] = count_emval_handles;
      Module2["get_first_emval"] = get_first_emval;
    }
    var Emval = { toValue: (handle) => {
      if (!handle) {
        throwBindingError("Cannot use deleted val. handle = " + handle);
      }
      return emval_handle_array[handle].value;
    }, toHandle: (value) => {
      switch (value) {
        case void 0:
          return 1;
        case null:
          return 2;
        case true:
          return 3;
        case false:
          return 4;
        default: {
          var handle = emval_free_list.length ? emval_free_list.pop() : emval_handle_array.length;
          emval_handle_array[handle] = { refcount: 1, value };
          return handle;
        }
      }
    } };
    function simpleReadValueFromPointer(pointer) {
      return this["fromWireType"](HEAP32[pointer >> 2]);
    }
    function __embind_register_emval(rawType, name2) {
      name2 = readLatin1String(name2);
      registerType(rawType, { name: name2, "fromWireType": function(handle) {
        var rv = Emval.toValue(handle);
        __emval_decref(handle);
        return rv;
      }, "toWireType": function(destructors, value) {
        return Emval.toHandle(value);
      }, "argPackAdvance": 8, "readValueFromPointer": simpleReadValueFromPointer, destructorFunction: null });
    }
    function floatReadValueFromPointer(name2, shift) {
      switch (shift) {
        case 2:
          return function(pointer) {
            return this["fromWireType"](HEAPF32[pointer >> 2]);
          };
        case 3:
          return function(pointer) {
            return this["fromWireType"](HEAPF64[pointer >> 3]);
          };
        default:
          throw new TypeError("Unknown float type: " + name2);
      }
    }
    function __embind_register_float(rawType, name2, size) {
      var shift = getShiftFromSize(size);
      name2 = readLatin1String(name2);
      registerType(rawType, { name: name2, "fromWireType": function(value) {
        return value;
      }, "toWireType": function(destructors, value) {
        return value;
      }, "argPackAdvance": 8, "readValueFromPointer": floatReadValueFromPointer(name2, shift), destructorFunction: null });
    }
    function runDestructors(destructors) {
      while (destructors.length) {
        var ptr = destructors.pop();
        var del = destructors.pop();
        del(ptr);
      }
    }
    function craftInvokerFunction(humanName, argTypes, classType, cppInvokerFunc, cppTargetFunc, isAsync) {
      var argCount = argTypes.length;
      if (argCount < 2) {
        throwBindingError("argTypes array size mismatch! Must at least get return value and 'this' types!");
      }
      var isClassMethodFunc = argTypes[1] !== null && classType !== null;
      var needsDestructorStack = false;
      for (var i = 1; i < argTypes.length; ++i) {
        if (argTypes[i] !== null && argTypes[i].destructorFunction === void 0) {
          needsDestructorStack = true;
          break;
        }
      }
      var returns = argTypes[0].name !== "void";
      var expectedArgCount = argCount - 2;
      var argsWired = new Array(expectedArgCount);
      var invokerFuncArgs = [];
      var destructors = [];
      return function() {
        if (arguments.length !== expectedArgCount) {
          throwBindingError("function " + humanName + " called with " + arguments.length + " arguments, expected " + expectedArgCount + " args!");
        }
        destructors.length = 0;
        var thisWired;
        invokerFuncArgs.length = isClassMethodFunc ? 2 : 1;
        invokerFuncArgs[0] = cppTargetFunc;
        if (isClassMethodFunc) {
          thisWired = argTypes[1]["toWireType"](destructors, this);
          invokerFuncArgs[1] = thisWired;
        }
        for (var i2 = 0; i2 < expectedArgCount; ++i2) {
          argsWired[i2] = argTypes[i2 + 2]["toWireType"](destructors, arguments[i2]);
          invokerFuncArgs.push(argsWired[i2]);
        }
        var rv = cppInvokerFunc.apply(null, invokerFuncArgs);
        function onDone(rv2) {
          if (needsDestructorStack) {
            runDestructors(destructors);
          } else {
            for (var i3 = isClassMethodFunc ? 1 : 2; i3 < argTypes.length; i3++) {
              var param = i3 === 1 ? thisWired : argsWired[i3 - 2];
              if (argTypes[i3].destructorFunction !== null) {
                argTypes[i3].destructorFunction(param);
              }
            }
          }
          if (returns) {
            return argTypes[0]["fromWireType"](rv2);
          }
        }
        return onDone(rv);
      };
    }
    function ensureOverloadTable(proto, methodName, humanName) {
      if (void 0 === proto[methodName].overloadTable) {
        var prevFunc = proto[methodName];
        proto[methodName] = function() {
          if (!proto[methodName].overloadTable.hasOwnProperty(arguments.length)) {
            throwBindingError("Function '" + humanName + "' called with an invalid number of arguments (" + arguments.length + ") - expects one of (" + proto[methodName].overloadTable + ")!");
          }
          return proto[methodName].overloadTable[arguments.length].apply(this, arguments);
        };
        proto[methodName].overloadTable = [];
        proto[methodName].overloadTable[prevFunc.argCount] = prevFunc;
      }
    }
    function exposePublicSymbol(name2, value, numArguments) {
      if (Module2.hasOwnProperty(name2)) {
        if (void 0 === numArguments || void 0 !== Module2[name2].overloadTable && void 0 !== Module2[name2].overloadTable[numArguments]) {
          throwBindingError("Cannot register public name '" + name2 + "' twice");
        }
        ensureOverloadTable(Module2, name2, name2);
        if (Module2.hasOwnProperty(numArguments)) {
          throwBindingError("Cannot register multiple overloads of a function with the same number of arguments (" + numArguments + ")!");
        }
        Module2[name2].overloadTable[numArguments] = value;
      } else {
        Module2[name2] = value;
        if (void 0 !== numArguments) {
          Module2[name2].numArguments = numArguments;
        }
      }
    }
    function heap32VectorToArray(count, firstElement) {
      var array = [];
      for (var i = 0; i < count; i++) {
        array.push(HEAPU32[firstElement + i * 4 >> 2]);
      }
      return array;
    }
    function replacePublicSymbol(name2, value, numArguments) {
      if (!Module2.hasOwnProperty(name2)) {
        throwInternalError("Replacing nonexistant public symbol");
      }
      if (void 0 !== Module2[name2].overloadTable && void 0 !== numArguments) {
        Module2[name2].overloadTable[numArguments] = value;
      } else {
        Module2[name2] = value;
        Module2[name2].argCount = numArguments;
      }
    }
    function dynCallLegacy(sig, ptr, args2) {
      var f = Module2["dynCall_" + sig];
      return args2 && args2.length ? f.apply(null, [ptr].concat(args2)) : f.call(null, ptr);
    }
    var wasmTableMirror = [];
    function getWasmTableEntry(funcPtr) {
      var func = wasmTableMirror[funcPtr];
      if (!func) {
        if (funcPtr >= wasmTableMirror.length) wasmTableMirror.length = funcPtr + 1;
        wasmTableMirror[funcPtr] = func = wasmTable.get(funcPtr);
      }
      return func;
    }
    function dynCall(sig, ptr, args2) {
      if (sig.includes("j")) {
        return dynCallLegacy(sig, ptr, args2);
      }
      var rtn = getWasmTableEntry(ptr).apply(null, args2);
      return rtn;
    }
    function getDynCaller(sig, ptr) {
      var argCache = [];
      return function() {
        argCache.length = 0;
        Object.assign(argCache, arguments);
        return dynCall(sig, ptr, argCache);
      };
    }
    function embind__requireFunction(signature, rawFunction) {
      signature = readLatin1String(signature);
      function makeDynCaller() {
        if (signature.includes("j")) {
          return getDynCaller(signature, rawFunction);
        }
        return getWasmTableEntry(rawFunction);
      }
      var fp = makeDynCaller();
      if (typeof fp != "function") {
        throwBindingError("unknown function pointer with signature " + signature + ": " + rawFunction);
      }
      return fp;
    }
    var UnboundTypeError = void 0;
    function getTypeName(type) {
      var ptr = ___getTypeName(type);
      var rv = readLatin1String(ptr);
      _free(ptr);
      return rv;
    }
    function throwUnboundTypeError(message, types) {
      var unboundTypes = [];
      var seen = {};
      function visit(type) {
        if (seen[type]) {
          return;
        }
        if (registeredTypes[type]) {
          return;
        }
        if (typeDependencies[type]) {
          typeDependencies[type].forEach(visit);
          return;
        }
        unboundTypes.push(type);
        seen[type] = true;
      }
      types.forEach(visit);
      throw new UnboundTypeError(message + ": " + unboundTypes.map(getTypeName).join([", "]));
    }
    function __embind_register_function(name2, argCount, rawArgTypesAddr, signature, rawInvoker, fn, isAsync) {
      var argTypes = heap32VectorToArray(argCount, rawArgTypesAddr);
      name2 = readLatin1String(name2);
      rawInvoker = embind__requireFunction(signature, rawInvoker);
      exposePublicSymbol(name2, function() {
        throwUnboundTypeError("Cannot call " + name2 + " due to unbound types", argTypes);
      }, argCount - 1);
      whenDependentTypesAreResolved([], argTypes, function(argTypes2) {
        var invokerArgsArray = [argTypes2[0], null].concat(argTypes2.slice(1));
        replacePublicSymbol(name2, craftInvokerFunction(name2, invokerArgsArray, null, rawInvoker, fn, isAsync), argCount - 1);
        return [];
      });
    }
    function integerReadValueFromPointer(name2, shift, signed) {
      switch (shift) {
        case 0:
          return signed ? function readS8FromPointer(pointer) {
            return HEAP8[pointer];
          } : function readU8FromPointer(pointer) {
            return HEAPU8[pointer];
          };
        case 1:
          return signed ? function readS16FromPointer(pointer) {
            return HEAP16[pointer >> 1];
          } : function readU16FromPointer(pointer) {
            return HEAPU16[pointer >> 1];
          };
        case 2:
          return signed ? function readS32FromPointer(pointer) {
            return HEAP32[pointer >> 2];
          } : function readU32FromPointer(pointer) {
            return HEAPU32[pointer >> 2];
          };
        default:
          throw new TypeError("Unknown integer type: " + name2);
      }
    }
    function __embind_register_integer(primitiveType, name2, size, minRange, maxRange) {
      name2 = readLatin1String(name2);
      if (maxRange === -1) {
        maxRange = 4294967295;
      }
      var shift = getShiftFromSize(size);
      var fromWireType = (value) => value;
      if (minRange === 0) {
        var bitshift = 32 - 8 * size;
        fromWireType = (value) => value << bitshift >>> bitshift;
      }
      var isUnsignedType = name2.includes("unsigned");
      var checkAssertions = (value, toTypeName) => {
      };
      var toWireType;
      if (isUnsignedType) {
        toWireType = function(destructors, value) {
          checkAssertions(value, this.name);
          return value >>> 0;
        };
      } else {
        toWireType = function(destructors, value) {
          checkAssertions(value, this.name);
          return value;
        };
      }
      registerType(primitiveType, { name: name2, "fromWireType": fromWireType, "toWireType": toWireType, "argPackAdvance": 8, "readValueFromPointer": integerReadValueFromPointer(name2, shift, minRange !== 0), destructorFunction: null });
    }
    function __embind_register_memory_view(rawType, dataTypeIndex, name2) {
      var typeMapping = [Int8Array, Uint8Array, Int16Array, Uint16Array, Int32Array, Uint32Array, Float32Array, Float64Array];
      var TA = typeMapping[dataTypeIndex];
      function decodeMemoryView(handle) {
        handle = handle >> 2;
        var heap = HEAPU32;
        var size = heap[handle];
        var data = heap[handle + 1];
        return new TA(heap.buffer, data, size);
      }
      name2 = readLatin1String(name2);
      registerType(rawType, { name: name2, "fromWireType": decodeMemoryView, "argPackAdvance": 8, "readValueFromPointer": decodeMemoryView }, { ignoreDuplicateRegistrations: true });
    }
    function __embind_register_std_string(rawType, name2) {
      name2 = readLatin1String(name2);
      var stdStringIsUTF8 = name2 === "std::string";
      registerType(rawType, { name: name2, "fromWireType": function(value) {
        var length = HEAPU32[value >> 2];
        var payload = value + 4;
        var str;
        if (stdStringIsUTF8) {
          var decodeStartPtr = payload;
          for (var i = 0; i <= length; ++i) {
            var currentBytePtr = payload + i;
            if (i == length || HEAPU8[currentBytePtr] == 0) {
              var maxRead = currentBytePtr - decodeStartPtr;
              var stringSegment = UTF8ToString(decodeStartPtr, maxRead);
              if (str === void 0) {
                str = stringSegment;
              } else {
                str += String.fromCharCode(0);
                str += stringSegment;
              }
              decodeStartPtr = currentBytePtr + 1;
            }
          }
        } else {
          var a = new Array(length);
          for (var i = 0; i < length; ++i) {
            a[i] = String.fromCharCode(HEAPU8[payload + i]);
          }
          str = a.join("");
        }
        _free(value);
        return str;
      }, "toWireType": function(destructors, value) {
        if (value instanceof ArrayBuffer) {
          value = new Uint8Array(value);
        }
        var length;
        var valueIsOfTypeString = typeof value == "string";
        if (!(valueIsOfTypeString || value instanceof Uint8Array || value instanceof Uint8ClampedArray || value instanceof Int8Array)) {
          throwBindingError("Cannot pass non-string to std::string");
        }
        if (stdStringIsUTF8 && valueIsOfTypeString) {
          length = lengthBytesUTF8(value);
        } else {
          length = value.length;
        }
        var base = _malloc(4 + length + 1);
        var ptr = base + 4;
        HEAPU32[base >> 2] = length;
        if (stdStringIsUTF8 && valueIsOfTypeString) {
          stringToUTF8(value, ptr, length + 1);
        } else {
          if (valueIsOfTypeString) {
            for (var i = 0; i < length; ++i) {
              var charCode = value.charCodeAt(i);
              if (charCode > 255) {
                _free(ptr);
                throwBindingError("String has UTF-16 code units that do not fit in 8 bits");
              }
              HEAPU8[ptr + i] = charCode;
            }
          } else {
            for (var i = 0; i < length; ++i) {
              HEAPU8[ptr + i] = value[i];
            }
          }
        }
        if (destructors !== null) {
          destructors.push(_free, base);
        }
        return base;
      }, "argPackAdvance": 8, "readValueFromPointer": simpleReadValueFromPointer, destructorFunction: function(ptr) {
        _free(ptr);
      } });
    }
    function UTF16ToString(ptr, maxBytesToRead) {
      var str = "";
      for (var i = 0; !(i >= maxBytesToRead / 2); ++i) {
        var codeUnit = HEAP16[ptr + i * 2 >> 1];
        if (codeUnit == 0) break;
        str += String.fromCharCode(codeUnit);
      }
      return str;
    }
    function stringToUTF16(str, outPtr, maxBytesToWrite) {
      if (maxBytesToWrite === void 0) {
        maxBytesToWrite = 2147483647;
      }
      if (maxBytesToWrite < 2) return 0;
      maxBytesToWrite -= 2;
      var startPtr = outPtr;
      var numCharsToWrite = maxBytesToWrite < str.length * 2 ? maxBytesToWrite / 2 : str.length;
      for (var i = 0; i < numCharsToWrite; ++i) {
        var codeUnit = str.charCodeAt(i);
        HEAP16[outPtr >> 1] = codeUnit;
        outPtr += 2;
      }
      HEAP16[outPtr >> 1] = 0;
      return outPtr - startPtr;
    }
    function lengthBytesUTF16(str) {
      return str.length * 2;
    }
    function UTF32ToString(ptr, maxBytesToRead) {
      var i = 0;
      var str = "";
      while (!(i >= maxBytesToRead / 4)) {
        var utf32 = HEAP32[ptr + i * 4 >> 2];
        if (utf32 == 0) break;
        ++i;
        if (utf32 >= 65536) {
          var ch = utf32 - 65536;
          str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023);
        } else {
          str += String.fromCharCode(utf32);
        }
      }
      return str;
    }
    function stringToUTF32(str, outPtr, maxBytesToWrite) {
      if (maxBytesToWrite === void 0) {
        maxBytesToWrite = 2147483647;
      }
      if (maxBytesToWrite < 4) return 0;
      var startPtr = outPtr;
      var endPtr = startPtr + maxBytesToWrite - 4;
      for (var i = 0; i < str.length; ++i) {
        var codeUnit = str.charCodeAt(i);
        if (codeUnit >= 55296 && codeUnit <= 57343) {
          var trailSurrogate = str.charCodeAt(++i);
          codeUnit = 65536 + ((codeUnit & 1023) << 10) | trailSurrogate & 1023;
        }
        HEAP32[outPtr >> 2] = codeUnit;
        outPtr += 4;
        if (outPtr + 4 > endPtr) break;
      }
      HEAP32[outPtr >> 2] = 0;
      return outPtr - startPtr;
    }
    function lengthBytesUTF32(str) {
      var len = 0;
      for (var i = 0; i < str.length; ++i) {
        var codeUnit = str.charCodeAt(i);
        if (codeUnit >= 55296 && codeUnit <= 57343) ++i;
        len += 4;
      }
      return len;
    }
    function __embind_register_std_wstring(rawType, charSize, name2) {
      name2 = readLatin1String(name2);
      var decodeString, encodeString, getHeap, lengthBytesUTF, shift;
      if (charSize === 2) {
        decodeString = UTF16ToString;
        encodeString = stringToUTF16;
        lengthBytesUTF = lengthBytesUTF16;
        getHeap = () => HEAPU16;
        shift = 1;
      } else if (charSize === 4) {
        decodeString = UTF32ToString;
        encodeString = stringToUTF32;
        lengthBytesUTF = lengthBytesUTF32;
        getHeap = () => HEAPU32;
        shift = 2;
      }
      registerType(rawType, { name: name2, "fromWireType": function(value) {
        var length = HEAPU32[value >> 2];
        var HEAP = getHeap();
        var str;
        var decodeStartPtr = value + 4;
        for (var i = 0; i <= length; ++i) {
          var currentBytePtr = value + 4 + i * charSize;
          if (i == length || HEAP[currentBytePtr >> shift] == 0) {
            var maxReadBytes = currentBytePtr - decodeStartPtr;
            var stringSegment = decodeString(decodeStartPtr, maxReadBytes);
            if (str === void 0) {
              str = stringSegment;
            } else {
              str += String.fromCharCode(0);
              str += stringSegment;
            }
            decodeStartPtr = currentBytePtr + charSize;
          }
        }
        _free(value);
        return str;
      }, "toWireType": function(destructors, value) {
        if (!(typeof value == "string")) {
          throwBindingError("Cannot pass non-string to C++ string type " + name2);
        }
        var length = lengthBytesUTF(value);
        var ptr = _malloc(4 + length + charSize);
        HEAPU32[ptr >> 2] = length >> shift;
        encodeString(value, ptr + 4, length + charSize);
        if (destructors !== null) {
          destructors.push(_free, ptr);
        }
        return ptr;
      }, "argPackAdvance": 8, "readValueFromPointer": simpleReadValueFromPointer, destructorFunction: function(ptr) {
        _free(ptr);
      } });
    }
    function __embind_register_void(rawType, name2) {
      name2 = readLatin1String(name2);
      registerType(rawType, { isVoid: true, name: name2, "argPackAdvance": 0, "fromWireType": function() {
        return void 0;
      }, "toWireType": function(destructors, o) {
        return void 0;
      } });
    }
    var emval_symbols = {};
    function getStringOrSymbol(address) {
      var symbol = emval_symbols[address];
      if (symbol === void 0) {
        return readLatin1String(address);
      }
      return symbol;
    }
    function emval_get_global() {
      if (typeof globalThis == "object") {
        return globalThis;
      }
      function testGlobal(obj) {
        obj["$$$embind_global$$$"] = obj;
        var success = typeof $$$embind_global$$$ == "object" && obj["$$$embind_global$$$"] == obj;
        if (!success) {
          delete obj["$$$embind_global$$$"];
        }
        return success;
      }
      if (typeof $$$embind_global$$$ == "object") {
        return $$$embind_global$$$;
      }
      if (typeof global == "object" && testGlobal(global)) {
        $$$embind_global$$$ = global;
      } else if (typeof self == "object" && testGlobal(self)) {
        $$$embind_global$$$ = self;
      }
      if (typeof $$$embind_global$$$ == "object") {
        return $$$embind_global$$$;
      }
      throw Error("unable to get global object.");
    }
    function __emval_get_global(name2) {
      if (name2 === 0) {
        return Emval.toHandle(emval_get_global());
      } else {
        name2 = getStringOrSymbol(name2);
        return Emval.toHandle(emval_get_global()[name2]);
      }
    }
    function __emval_incref(handle) {
      if (handle > 4) {
        emval_handle_array[handle].refcount += 1;
      }
    }
    function requireRegisteredType(rawType, humanName) {
      var impl = registeredTypes[rawType];
      if (void 0 === impl) {
        throwBindingError(humanName + " has unknown type " + getTypeName(rawType));
      }
      return impl;
    }
    function craftEmvalAllocator(argCount) {
      var argsList = new Array(argCount + 1);
      return function(constructor, argTypes, args2) {
        argsList[0] = constructor;
        for (var i = 0; i < argCount; ++i) {
          var argType = requireRegisteredType(HEAPU32[argTypes + i * 4 >> 2], "parameter " + i);
          argsList[i + 1] = argType["readValueFromPointer"](args2);
          args2 += argType["argPackAdvance"];
        }
        var obj = new (constructor.bind.apply(constructor, argsList))();
        return Emval.toHandle(obj);
      };
    }
    var emval_newers = {};
    function __emval_new(handle, argCount, argTypes, args2) {
      handle = Emval.toValue(handle);
      var newer = emval_newers[argCount];
      if (!newer) {
        newer = craftEmvalAllocator(argCount);
        emval_newers[argCount] = newer;
      }
      return newer(handle, argTypes, args2);
    }
    function _abort() {
      abort("");
    }
    function _emscripten_memcpy_big(dest, src, num) {
      HEAPU8.copyWithin(dest, src, src + num);
    }
    function getHeapMax() {
      return 2147483648;
    }
    function emscripten_realloc_buffer(size) {
      var b = wasmMemory.buffer;
      try {
        wasmMemory.grow(size - b.byteLength + 65535 >>> 16);
        updateMemoryViews();
        return 1;
      } catch (e) {
      }
    }
    function _emscripten_resize_heap(requestedSize) {
      var oldSize = HEAPU8.length;
      requestedSize = requestedSize >>> 0;
      var maxHeapSize = getHeapMax();
      if (requestedSize > maxHeapSize) {
        return false;
      }
      let alignUp = (x, multiple) => x + (multiple - x % multiple) % multiple;
      for (var cutDown = 1; cutDown <= 4; cutDown *= 2) {
        var overGrownHeapSize = oldSize * (1 + 0.2 / cutDown);
        overGrownHeapSize = Math.min(overGrownHeapSize, requestedSize + 100663296);
        var newSize = Math.min(maxHeapSize, alignUp(Math.max(requestedSize, overGrownHeapSize), 65536));
        var replacement = emscripten_realloc_buffer(newSize);
        if (replacement) {
          return true;
        }
      }
      return false;
    }
    embind_init_charCodes();
    BindingError = Module2["BindingError"] = extendError(Error, "BindingError");
    InternalError = Module2["InternalError"] = extendError(Error, "InternalError");
    init_emval();
    UnboundTypeError = Module2["UnboundTypeError"] = extendError(Error, "UnboundTypeError");
    var wasmImports = { "n": ___cxa_throw, "o": __embind_register_bigint, "l": __embind_register_bool, "r": __embind_register_emval, "k": __embind_register_float, "c": __embind_register_function, "b": __embind_register_integer, "a": __embind_register_memory_view, "g": __embind_register_std_string, "f": __embind_register_std_wstring, "m": __embind_register_void, "d": __emval_decref, "e": __emval_get_global, "i": __emval_incref, "h": __emval_new, "j": _abort, "q": _emscripten_memcpy_big, "p": _emscripten_resize_heap };
    var asm = createWasm();
    var ___wasm_call_ctors = function() {
      return (___wasm_call_ctors = Module2["asm"]["t"]).apply(null, arguments);
    };
    var _malloc = function() {
      return (_malloc = Module2["asm"]["u"]).apply(null, arguments);
    };
    var _free = function() {
      return (_free = Module2["asm"]["v"]).apply(null, arguments);
    };
    var ___getTypeName = Module2["___getTypeName"] = function() {
      return (___getTypeName = Module2["___getTypeName"] = Module2["asm"]["w"]).apply(null, arguments);
    };
    var __embind_initialize_bindings = Module2["__embind_initialize_bindings"] = function() {
      return (__embind_initialize_bindings = Module2["__embind_initialize_bindings"] = Module2["asm"]["x"]).apply(null, arguments);
    };
    var ___errno_location = function() {
      return (___errno_location = Module2["asm"]["__errno_location"]).apply(null, arguments);
    };
    var ___cxa_is_pointer_type = function() {
      return (___cxa_is_pointer_type = Module2["asm"]["z"]).apply(null, arguments);
    };
    var calledRun;
    dependenciesFulfilled = function runCaller() {
      if (!calledRun) run();
      if (!calledRun) dependenciesFulfilled = runCaller;
    };
    function run() {
      if (runDependencies > 0) {
        return;
      }
      preRun();
      if (runDependencies > 0) {
        return;
      }
      function doRun() {
        if (calledRun) return;
        calledRun = true;
        Module2["calledRun"] = true;
        if (ABORT) return;
        initRuntime();
        readyPromiseResolve(Module2);
        if (Module2["onRuntimeInitialized"]) Module2["onRuntimeInitialized"]();
        postRun();
      }
      if (Module2["setStatus"]) {
        Module2["setStatus"]("Running...");
        setTimeout(function() {
          setTimeout(function() {
            Module2["setStatus"]("");
          }, 1);
          doRun();
        }, 1);
      } else {
        doRun();
      }
    }
    if (Module2["preInit"]) {
      if (typeof Module2["preInit"] == "function") Module2["preInit"] = [Module2["preInit"]];
      while (Module2["preInit"].length > 0) {
        Module2["preInit"].pop()();
      }
    }
    run();
    return Module2.ready;
  });
})();
var webp_dec_default = Module;

// node_modules/@jsquash/webp/utils.js
function initEmscriptenModule(moduleFactory, wasmModule, moduleOptionOverrides = {}) {
  let instantiateWasm;
  if (wasmModule) {
    instantiateWasm = (imports, callback) => {
      const instance = new WebAssembly.Instance(wasmModule, imports);
      callback(instance);
      return instance.exports;
    };
  }
  return moduleFactory({
    // Just to be safe, don't automatically invoke any wasm functions
    noInitialRun: true,
    instantiateWasm,
    ...moduleOptionOverrides
  });
}

// node_modules/@jsquash/webp/decode.js
var emscriptenModule;
async function init(module, moduleOptionOverrides) {
  let actualModule = module;
  let actualOptions = moduleOptionOverrides;
  if (arguments.length === 1 && !(module instanceof WebAssembly.Module)) {
    actualModule = void 0;
    actualOptions = module;
  }
  emscriptenModule = initEmscriptenModule(webp_dec_default, actualModule, actualOptions);
}
async function decode(buffer) {
  if (!emscriptenModule)
    init();
  const module = await emscriptenModule;
  const result = module.decode(buffer);
  if (!result)
    throw new Error("Decoding error");
  return result;
}

// src/image.ts
function imageInfo(buf) {
  if (buf.length >= 33 && buf.readUInt32BE(0) === 2303741511 && buf.toString("ascii", 12, 16) === "IHDR") {
    const colorType = buf[25];
    let hasAlpha = colorType === 4 || colorType === 6;
    for (let at = 8; !hasAlpha && at + 8 <= buf.length; ) {
      const type = buf.toString("ascii", at + 4, at + 8);
      if (type === "tRNS") hasAlpha = true;
      if (type === "IDAT" || type === "IEND") break;
      at += 12 + buf.readUInt32BE(at);
    }
    return { format: "png", width: buf.readUInt32BE(16), height: buf.readUInt32BE(20), hasAlpha };
  }
  if (buf.length >= 30 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
    const chunk = buf.toString("ascii", 12, 16);
    if (chunk === "VP8X")
      return {
        format: "webp",
        width: 1 + buf.readUIntLE(24, 3),
        height: 1 + buf.readUIntLE(27, 3),
        hasAlpha: (buf[20] & 16) !== 0
      };
    if (chunk === "VP8L") {
      const bits = buf.readUInt32LE(21);
      return {
        format: "webp",
        width: 1 + (bits & 16383),
        height: 1 + (bits >>> 14 & 16383),
        hasAlpha: (bits >>> 28 & 1) === 1
      };
    }
    if (chunk === "VP8 ")
      return {
        format: "webp",
        width: buf.readUInt16LE(26) & 16383,
        height: buf.readUInt16LE(28) & 16383,
        hasAlpha: false
      };
  }
  throw new Error("Use a PNG or WebP image");
}
async function readImageInfo(file) {
  return imageInfo(await readFile(file));
}
var webpReady;
function webpWasm() {
  const bundled = fileURLToPath2(new URL("./webp_dec.wasm", import.meta.url));
  return existsSync2(bundled) ? bundled : createRequire(import.meta.url).resolve("@jsquash/webp/codec/dec/webp_dec.wasm");
}
async function decodeRgba(file) {
  const buf = await readFile(file);
  const info = imageInfo(buf);
  if (info.format === "png") return { ...info, data: import_pngjs.PNG.sync.read(buf).data };
  globalThis.ImageData ??= class {
    constructor(data, width, height) {
      this.data = data;
      this.width = width;
      this.height = height;
    }
    data;
    width;
    height;
  };
  webpReady ??= WebAssembly.compile(readFileSync2(webpWasm())).then(
    (module) => init(module)
  );
  await webpReady;
  const decoded = await decode(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  return { ...info, data: new Uint8Array(decoded.data.buffer, decoded.data.byteOffset, decoded.data.byteLength) };
}

// src/hosts/art.ts
async function validateArt(file) {
  const info = await stat(file);
  if (!info.isFile() || info.size > 64 * 1024 * 1024) throw new Error("Artwork must be a regular file below 64 MiB");
  const meta = await readImageInfo(file);
  if (!meta.hasAlpha) throw new Error("Pet images must have an alpha channel");
  if (meta.width * meta.height > 16e6) throw new Error("Image exceeds size limit");
  checkAtlas(await decodeRgba(file));
  return meta;
}

// src/hosts/artwork.ts
import { createHash as createHash2 } from "node:crypto";
import { readFile as readFile2, stat as stat2 } from "node:fs/promises";
import path2 from "node:path";
async function artworkFingerprint(file) {
  if (!path2.isAbsolute(file)) throw new Error("Artwork readback must be an absolute local file");
  const info = await stat2(file);
  if (!info.isFile() || info.size > 64 * 1024 * 1024)
    throw new Error("Artwork readback must be a regular file below 64 MiB");
  const image = await decodeRgba(file);
  const pixels = new Uint8Array(image.data);
  for (let at = 0; at < pixels.length; at += 4)
    if (pixels[at + 3] === 0) pixels[at] = pixels[at + 1] = pixels[at + 2] = 0;
  return {
    fileSha256: createHash2("sha256").update(await readFile2(file)).digest("hex"),
    artworkSha256: createHash2("sha256").update(JSON.stringify([image.width, image.height])).update(pixels).digest("hex"),
    width: image.width,
    height: image.height
  };
}
async function verifyStoredArtwork(acceptedFile, readbackFile) {
  const [accepted, stored] = await Promise.all([artworkFingerprint(acceptedFile), artworkFingerprint(readbackFile)]);
  return {
    storedArtworkVerified: accepted.artworkSha256 === stored.artworkSha256,
    acceptedArtworkSha256: accepted.artworkSha256,
    storedArtworkSha256: stored.artworkSha256,
    acceptedFileSha256: accepted.fileSha256,
    storedFileSha256: stored.fileSha256
  };
}

// src/hosts/cloud-request.ts
async function cloudAppearanceRequest(state, target2) {
  if (!state.pending?.plan?.appearance) throw new Error("No planned appearance update");
  const pending = pendingFor(state, state.pending.id);
  const art = desiredAppearance(state);
  if (!art || art.kind !== "atlas") throw new Error("Complete or select validated Pet atlas artwork first");
  if (!target2.cloudId || target2.avatarId !== target2.cloudId)
    throw new Error(target2.reason ?? "Resolve the actual cloud Pet ID first");
  await validateArt(art.file);
  const accepted = await artworkFingerprint(art.file);
  return {
    operation: "update-cloud-pet",
    petId: pending.petId,
    operationId: pending.id,
    appearanceId: art.id,
    avatarId: target2.cloudId,
    cloudId: target2.cloudId,
    target: { avatarId: target2.cloudId, cloudId: target2.cloudId, localAvatarId: target2.localAvatarId },
    file: art.file,
    acceptedArtworkSha256: accepted.artworkSha256,
    updated: false,
    storedArtworkVerified: null,
    active: target2.active,
    refreshRequested: false,
    displayStatus: "unconfirmed",
    preserveCurrentSelection: true,
    agentSteps: cloudUploadSteps(art.file, target2.cloudId, {
      command: "host-result",
      operationId: pending.id,
      check: "Pass the actual downloaded readbackFile and observed tool results. Runtime compares accepted and stored pixels; a boolean alone cannot prove the update."
    }),
    notice: "The cloud Pet still needs upload and actual host readback. This story remains pending until the stored artwork matches."
  };
}
function cloudUploadSteps(file, cloudId, finalStep) {
  return [
    {
      tool: "validate_pet_spritesheet",
      arguments: { file },
      check: "Repair structural errors while preserving the accepted design."
    },
    { tool: "prepare_pet_upload", arguments: { file }, save: "upload_session_id" },
    {
      tool: "update_pet",
      arguments: { pet_id: cloudId, updates: { upload_session_id: "<prepared upload_session_id>" } },
      check: "Update this exact existing Pet ID; preserve name, description and selection."
    },
    {
      tool: "get_pet_download_link",
      arguments: { pet_id: cloudId },
      check: "Use this fresh host URL immediately to save a separate readback file. Do not reuse the upload input or persist the temporary URL."
    },
    finalStep
  ];
}

// src/hosts/desktop/mapping.ts
import { readFile as readFile3 } from "node:fs/promises";
import path3 from "node:path";
var record = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
var isCloudId = (value) => typeof value === "string" && /^pet_[a-zA-Z0-9_-]+$/.test(value);
async function readMigrationMap(home = codexHome()) {
  try {
    const state = JSON.parse(await readFile3(path3.join(home, ".codex-global-state.json"), "utf8"));
    if (!record(state)) throw new Error("Invalid host Pet state");
    const atoms = state["electron-persisted-atom-state"] ?? {};
    if (!record(atoms)) throw new Error("Invalid host Pet state");
    const migrations = atoms["migrated-cloud-pet-ids-v1"] ?? {};
    const pending = atoms["pending-cloud-pet-migrations-v1"] ?? {};
    if (!record(migrations) || !record(pending)) throw new Error("Invalid host Pet migration map");
    const cache = atoms["cloud-pet-artwork-cache"];
    const accountKey = record(cache) && typeof cache.accountId === "string" && cache.accountId.trim() && typeof cache.userId === "string" && cache.userId.trim() ? JSON.stringify([cache.accountId, cache.userId]) : void 0;
    const scopes = [.../* @__PURE__ */ new Set([...Object.keys(migrations), ...Object.keys(pending)])];
    if (accountKey === void 0 && scopes.length > 0)
      return { available: false, mappings: {}, pending: [], reason: "Current Pet account scope is unknown" };
    const scope = accountKey;
    const mappings = scope ? migrations[scope] ?? {} : {};
    const unfinished = scope ? pending[scope] ?? {} : {};
    if (!record(mappings) || !record(unfinished)) throw new Error("Invalid host Pet migration scope");
    const result = {};
    for (const [localId, cloudId] of Object.entries(mappings)) {
      if (!localId.startsWith("custom:") || !isCloudId(cloudId)) throw new Error("Invalid host Pet migration target");
      result[localId] = cloudId;
    }
    return {
      available: true,
      mappings: result,
      pending: Object.keys(unfinished).filter((id) => id.startsWith("custom:"))
    };
  } catch (error) {
    const code = error.code;
    return {
      available: false,
      mappings: {},
      pending: [],
      reason: code === "ENOENT" ? "Host Pet migration state is unavailable" : "Host Pet migration state cannot be read safely"
    };
  }
}

// src/hosts/desktop/switch.ts
import { readFile as readFile4, readdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import net from "node:net";
import path4 from "node:path";

// src/hosts/desktop/frames.ts
function encodeFrame(message) {
  const body = Buffer.from(JSON.stringify(message));
  const header = Buffer.alloc(4);
  header.writeUInt32LE(body.length);
  return Buffer.concat([header, body]);
}
function readFrames(maxBytes, onMessage, onError) {
  let buffer = Buffer.alloc(0);
  let failed = false;
  return (chunk) => {
    if (failed) return;
    buffer = Buffer.concat([buffer, chunk]);
    while (buffer.length >= 4) {
      const length = buffer.readUInt32LE(0);
      if (length > maxBytes) {
        failed = true;
        return onError("too-large");
      }
      if (buffer.length < length + 4) return;
      const body = buffer.subarray(4, length + 4);
      buffer = buffer.subarray(length + 4);
      let message;
      try {
        message = JSON.parse(body.toString("utf8"));
      } catch {
        failed = true;
        return onError("invalid-json");
      }
      onMessage(message);
    }
  };
}

// src/hosts/desktop/switch.ts
var BUILTIN_PETS = [
  ["codex", "Codex"],
  ["dewey", "Dewey"],
  ["fireball", "Fireball"],
  ["hoots", "Hoots"],
  ["rocky", "Rocky"],
  ["seedy", "Seedy"],
  ["stacky", "Stacky"],
  ["bsod", "BSOD"],
  ["null-signal", "Null Signal"]
].map(([id, displayName]) => ({ id, displayName, source: "builtin" }));
var isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
async function listPets(home = codexHome()) {
  const errors = [];
  const local = /* @__PURE__ */ new Map();
  const migration = await readMigrationMap(home);
  for (const [directory, filename] of [
    ["avatars", "avatar.json"],
    ["pets", "pet.json"]
  ]) {
    let entries;
    try {
      entries = await readdir(path4.join(home, directory), { withFileTypes: true });
    } catch (error) {
      if (error.code !== "ENOENT") errors.push(`${directory}: \u65E0\u6CD5\u8BFB\u53D6\u5BA0\u7269\u76EE\u5F55`);
      continue;
    }
    for (const entry of entries) {
      if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
      let text2;
      try {
        text2 = await readFile4(path4.join(home, directory, entry.name, filename), "utf8");
      } catch (error) {
        if (error.code === "ENOENT") continue;
        errors.push(`${directory}/${entry.name}/${filename}: \u65E0\u6CD5\u8BFB\u53D6\u6709\u6548\u5BA0\u7269\u6E05\u5355`);
        continue;
      }
      try {
        const manifest = JSON.parse(text2);
        if (!isRecord(manifest)) throw new Error("Invalid manifest");
        for (const key2 of ["id", "displayName"])
          if (manifest[key2] !== void 0 && (typeof manifest[key2] !== "string" || !manifest[key2].trim()))
            throw new Error("Invalid name");
        const localId = `custom:${entry.name}`;
        const cloudId = migration.available ? migration.mappings[localId] : void 0;
        const id = cloudId ?? localId;
        const displayName = (manifest.displayName ?? manifest.id ?? entry.name).trim();
        local.set(id, { id, displayName, source: cloudId ? "cloud" : "local", ...cloudId ? { localId } : {} });
      } catch {
        errors.push(`${directory}/${entry.name}/${filename}: \u65E0\u6CD5\u8BFB\u53D6\u6709\u6548\u5BA0\u7269\u6E05\u5355`);
      }
    }
  }
  const sorted = [...local.values()].sort((a, b) => a.displayName.localeCompare(b.displayName));
  return { pets: [...BUILTIN_PETS.map((pet) => ({ ...pet })), ...sorted], ...errors.length ? { errors } : {} };
}
async function readSelectedPet(options = {}) {
  try {
    return { available: true, ...await callSettings(options) };
  } catch (error) {
    return {
      available: false,
      reason: error instanceof Error ? error.message : "Live Codex pet selection is unavailable."
    };
  }
}
async function selectPet(petId2, options = {}) {
  if (typeof petId2 !== "string" || petId2.trim() !== petId2 || petId2.length === 0 || petId2.length > 512 || /[\x00-\x1f\x7f]/.test(petId2))
    throw new Error("A valid pet ID is required.");
  await callSettings(options, petId2);
  const result = await callSettings(options);
  if (result.selectedPetId !== petId2 || result.effectiveSelectedPetId !== petId2)
    throw new Error("The live Codex selection did not match the requested pet; its current selection is unconfirmed.");
  return {
    ...result,
    immediate: true,
    restartRequired: false,
    hostStateConfirmed: true,
    visualVerified: false
  };
}
var SWITCH_USAGE = "Usage: switch-pet [PET_ID|--current|--list|--help]";
async function switchPet(args2) {
  if (args2.length > 1) throw new Error(SWITCH_USAGE);
  const target2 = args2[0] ?? "--current";
  if (target2 === "--help")
    return { usage: SWITCH_USAGE, examples: ["switch-pet --list", "switch-pet --current", "switch-pet dewey"] };
  if (target2 === "--current") {
    const current = await readSelectedPet();
    if (!current.available) throw new Error(current.reason);
    return current;
  }
  if (target2.startsWith("-") && target2 !== "--list") throw new Error(SWITCH_USAGE);
  const catalog = await listPets();
  if (target2 === "--list") return catalog;
  const entry = catalog.pets.find((pet) => pet.id === target2 || pet.localId === target2);
  if (!entry) throw new Error(`Unknown pet ID: ${target2}. Use switch-pet --list.`);
  appToolsConnection({});
  if (!process.env.CODEX_TURN_ID?.trim())
    return {
      operation: "select-pet",
      targetId: entry.id,
      selected: false,
      agentSteps: entry.id.startsWith("custom:") ? [] : [
        { tool: "select_pet", arguments: { pet_id: entry.id } },
        {
          command: "switch-pet --current",
          check: "Independently confirm the exact selected ID; display is unknown."
        }
      ],
      notice: entry.id.startsWith("custom:") ? `The active turn ID is unavailable. Select ${entry.displayName} (${entry.id}) in the host Pet settings.` : "Use the supported host selection tool; the CLI has no current active turn ID and has not changed selection."
    };
  return selectPet(entry.id);
}
var SELECTED_KEY = "selected-avatar-id";
function appToolsConnection(options) {
  const pick = (key2, env) => (Object.hasOwn(options, key2) ? options[key2] : env)?.trim();
  const pipePath = pick("pipePath", process.env.CODEX_APP_TOOLS_PIPE_PATH);
  const threadId = pick("threadId", process.env.CODEX_THREAD_ID);
  if (!pipePath || !threadId) throw new Error("The current Codex app tools pipe and thread ID are unavailable.");
  if (process.platform === "win32" && !pipePath.startsWith("\\\\.\\pipe\\"))
    throw new Error("Expected a local Windows named pipe for Codex app tools.");
  const timeoutMs = options.timeoutMs ?? 5e3;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new Error("The Codex app tools timeout must be positive.");
  return { pipePath, threadId, timeoutMs };
}
function projectSelection(value) {
  if (!isRecord(value) || !isRecord(value.settings) || !isRecord(value.effectiveSettings))
    throw new Error("Codex returned an invalid settings response.");
  const selectedPetId = value.settings[SELECTED_KEY] ?? null;
  const effectiveSelectedPetId = value.effectiveSettings[SELECTED_KEY] ?? null;
  if (selectedPetId !== null && typeof selectedPetId !== "string" || effectiveSelectedPetId !== null && typeof effectiveSelectedPetId !== "string")
    throw new Error("Codex returned an invalid pet selection.");
  return { selectedPetId, effectiveSelectedPetId };
}
async function callSettings(options, petId2) {
  const { pipePath, threadId, timeoutMs } = appToolsConnection(options);
  const turnId = (Object.hasOwn(options, "turnId") ? options.turnId : process.env.CODEX_TURN_ID)?.trim();
  if (petId2 !== void 0 && !turnId)
    throw new Error("The current active turn ID is unavailable; use the host select_pet tool for known pets.");
  const id = 1;
  const request = {
    jsonrpc: "2.0",
    id,
    method: "tools/call",
    params: {
      namespace: "codex_app",
      tool: petId2 === void 0 ? "read_settings" : "write_settings",
      arguments: petId2 === void 0 ? { include_config: false } : { settings: { [SELECTED_KEY]: petId2 } },
      callerSource: "codex",
      threadId,
      callId: `mcp-call-${randomUUID()}`,
      // The host checks the active turn on writes; a fabricated ID cannot authorize a write.
      turnId: turnId ?? `mcp-turn-${randomUUID()}`
    }
  };
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(pipePath);
    let settled = false;
    let sent = false;
    const finish = (error, result, cancel = false) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (cancel && sent && !socket.destroyed) {
        socket.end(encodeFrame({ jsonrpc: "2.0", id, method: "tools/cancel" }));
        socket.destroySoon();
      } else socket.destroy();
      if (error) reject(error);
      else resolve(result);
    };
    const timer = setTimeout(
      () => finish(new Error("Codex app tools timed out; the current selection is unconfirmed."), void 0, true),
      timeoutMs
    );
    socket.once("connect", () => {
      sent = true;
      socket.write(encodeFrame(request));
    });
    socket.on(
      "error",
      (error) => finish(
        new Error(`Codex app tools connection failed (${error.code ?? "socket error"}).`)
      )
    );
    socket.on("close", () => finish(new Error("Codex app tools closed before confirming the pet selection.")));
    socket.on(
      "data",
      readFrames(
        8 * 1024 * 1024,
        (response) => {
          if (settled || !isRecord(response) || response.id !== id) return;
          if (response.error !== void 0) {
            const error = response.error;
            const code = isRecord(error) && typeof error.code === "number" ? ` (${error.code})` : "";
            const message = isRecord(error) && typeof error.message === "string" ? error.message.replace(/[\x00-\x1f\x7f]/g, " ").slice(0, 512) : "No host error message";
            return finish(new Error(`Codex rejected ${request.params.tool}${code}: ${message}`));
          }
          const result = response.result;
          if (!isRecord(result) || result.success !== true || !Array.isArray(result.contentItems))
            return finish(new Error("Codex could not complete the pet settings request."));
          const item = result.contentItems.find((item2) => isRecord(item2) && item2.type === "inputText");
          if (!isRecord(item) || typeof item.text !== "string")
            return finish(new Error("Codex returned no pet settings result."));
          try {
            finish(void 0, projectSelection(JSON.parse(item.text)));
          } catch {
            finish(new Error("Codex returned an invalid pet settings result."));
          }
        },
        (problem) => finish(
          new Error(
            problem === "too-large" ? "Codex app tools response exceeded the size limit." : "Codex app tools returned invalid JSON."
          )
        )
      )
    );
  });
}

// src/hosts/identity.ts
async function selectedAvatar() {
  const result = await readSelectedPet();
  return result.available ? { available: true, id: result.effectiveSelectedPetId } : { available: false, id: null, error: result.reason };
}
async function findAvatar(state, options = {}) {
  if (!state.pet) throw new Error("No pet");
  const binding = state.pet.binding;
  const selected = await (options.selection ?? readSelectedPet)();
  const localId = binding?.avatarId.startsWith("custom:") ? binding.avatarId : !binding ? `custom:${state.pet.id}` : null;
  const mapping = state.host === "desktop" ? await (options.mapping ?? (() => readMigrationMap(options.home ?? codexHome())))() : { available: true, mappings: {}, pending: [] };
  const directCloud = isCloudId(binding?.avatarId) ? binding.avatarId : state.host === "cloud" && isCloudId(binding?.cloudId) ? binding.cloudId : null;
  const mappedCloud = localId && mapping.available ? mapping.mappings[localId] ?? null : null;
  const cloudId = directCloud ?? mappedCloud;
  const migrationPending = Boolean(localId && mapping.pending.includes(localId));
  let avatarId = cloudId ?? (state.host === "desktop" ? localId : null);
  let reason;
  if (state.host === "desktop" && binding && localId && !mapping.available) {
    avatarId = null;
    reason = mapping.reason ?? "The host Pet migration mapping is unavailable";
  } else if (state.host === "desktop" && localId && binding?.cloudId && !mappedCloud) {
    avatarId = null;
    reason = "The current host migration map does not confirm the saved cloud binding";
  } else if (migrationPending && !cloudId) {
    avatarId = null;
    reason = "The host is still migrating this local Pet; resume after its cloud ID is available";
  } else if (!avatarId) reason = "Bind the existing cloud Pet ID before updating this Pet";
  const aliases = [...new Set([localId, cloudId].filter((id) => Boolean(id)))];
  const active = avatarId && selected.available ? aliases.includes(selected.effectiveSelectedPetId ?? "") : null;
  return {
    petId: state.pet.id,
    avatarId,
    localAvatarId: localId,
    cloudId,
    aliases,
    mappingAvailable: mapping.available,
    migrationPending,
    active,
    selection: selected,
    ...binding?.destination ? { destination: binding.destination } : {},
    ...reason ? { reason } : {}
  };
}

// src/hosts/result.ts
import path6 from "node:path";

// src/model.ts
import { randomUUID as randomUUID2 } from "node:crypto";
var stages = ["egg", "hatchling", "juvenile", "adult"];
var artKinds = ["portrait", "atlas", "story", "artifact"];
var fresh = (host2) => ({ version: 3, host: host2, pet: null, stories: [], art: [], pending: null });
function createPet(name2, now = Date.now()) {
  return {
    id: `genpet-${randomUUID2()}`,
    name: name2 === void 0 ? "GenPet" : text(name2, "name"),
    adoptedAt: now,
    revision: 0,
    naming: name2 === void 0 ? { status: "unasked" } : { status: "named", namedAt: now },
    soul: { genes: null },
    memory: { text: "", updatedAt: now },
    state: { stage: "egg", description: "", updatedAt: now }
  };
}
function text(value, field) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${field} must be nonempty text`);
  return value.trim();
}
function identifier(value, field = "id") {
  const result = text(value, field);
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,199}$/.test(result)) throw new Error(`Invalid ${field}`);
  return result;
}
function validateStage(current, target2) {
  if (!stages.includes(target2)) throw new Error("Invalid stage");
  if (stages.indexOf(target2) < stages.indexOf(current))
    throw new Error("Evolution cannot reverse the current stage");
  return target2;
}

// src/hosts/desktop/refresh.ts
import net2 from "node:net";
import { lstat, readFile as readFile5 } from "node:fs/promises";
import { createHash as createHash3, randomUUID as randomUUID3 } from "node:crypto";
import path5 from "node:path";
var CLOUD_PET_QUERY = ["cloud-pets", "list"];
function desktopIpcPath() {
  return process.platform === "win32" ? "\\\\.\\pipe\\codex-ipc" : path5.join(codexHome(), "ipc", "ipc.sock");
}
function isLiveDestination(destination) {
  if (process.env.GENPET_SKIP_NATIVE_REFRESH === "1") return false;
  const relative = path5.relative(path5.resolve(codexHome(), "pets"), path5.resolve(destination));
  return /^genpet-[a-zA-Z0-9_-]+$/.test(relative);
}
async function refreshNativePet(options) {
  const expectedSpriteSha256 = createHash3("sha256").update(await readFile5(options.expectedSpritePath)).digest("hex");
  const useIpc = options.ipcSocketPath !== null && (typeof options.ipcSocketPath === "string" || options.cloudId !== void 0 && process.env.GENPET_SKIP_NATIVE_REFRESH !== "1" || isLiveDestination(path5.dirname(options.expectedSpritePath)));
  const errors = [];
  if (useIpc) {
    try {
      const ipc = await refreshViaIpc(options.ipcSocketPath ?? void 0, options.timeoutMs ?? 2e3, [
        options.cloudId ? CLOUD_PET_QUERY : ["custom-avatars"]
      ]);
      return {
        automaticRefresh: true,
        refreshRequested: true,
        displayStatus: "unconfirmed",
        strategy: "ipc-query-invalidate",
        ipc,
        expectedSpriteSha256,
        notice: "Automatic refresh requested through the existing desktop IPC channel. Router relay confirmed; the displayed sprite hash was not measured."
      };
    } catch (error) {
      errors.push(`ipc: ${error.message}`);
    }
  }
  return {
    automaticRefresh: false,
    refreshRequested: false,
    displayStatus: "unconfirmed",
    strategy: "none",
    expectedSpriteSha256,
    notice: useIpc ? "Files committed to the same GenPet entry. IPC refresh failed; retry when the desktop is running and ready. Visible update remains unconfirmed." : "Files committed to the same GenPet entry. IPC refresh was skipped for this destination. Visible update remains unconfirmed.",
    ...errors.length ? { errors } : {}
  };
}
async function refreshViaIpc(socketPath = desktopIpcPath(), timeoutMs = 2e3, queryKeys = [["custom-avatars"]]) {
  return relayInvalidations(socketPath, timeoutMs, queryKeys, false);
}
async function probeIpc(socketPath = desktopIpcPath(), timeoutMs = 2e3) {
  return relayInvalidations(socketPath, timeoutMs, [["custom-avatars"]], true);
}
async function relayInvalidations(socketPath, timeoutMs, queryKeys, observerOnly) {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw Error("IPC timeout must be positive");
  if (!queryKeys.length || queryKeys.some(
    (key2) => JSON.stringify(key2) !== JSON.stringify(["custom-avatars"]) && JSON.stringify(key2) !== JSON.stringify(CLOUD_PET_QUERY)
  ))
    throw Error("Only known Pet resource query keys may be refreshed");
  await assertPrivateSocket(socketPath);
  const sockets = /* @__PURE__ */ new Set();
  const waiting = /* @__PURE__ */ new Set();
  let failure;
  const fail = (error) => {
    failure ??= error;
    for (const reject of [...waiting]) reject(error);
  };
  const deadline = setTimeout(() => fail(Error("IPC refresh timed out")), timeoutMs);
  const connect = () => new Promise((resolve, reject) => {
    if (failure) return reject(failure);
    waiting.add(reject);
    const socket = net2.createConnection(socketPath);
    sockets.add(socket);
    const requestId2 = randomUUID3();
    let listener;
    const send = (message) => {
      if (failure) throw failure;
      socket.write(encodeFrame(message));
    };
    socket.on("error", fail);
    socket.on("close", () => fail(Error("IPC connection closed")));
    socket.on(
      "connect",
      () => send({
        type: "request",
        requestId: requestId2,
        sourceClientId: "genpet",
        version: 0,
        method: "initialize",
        params: { clientType: "genpet" }
      })
    );
    socket.on(
      "data",
      readFrames(
        16 * 1024 * 1024,
        (value) => {
          if (!value || typeof value !== "object") return fail(Error("Invalid IPC message"));
          const message = value;
          if (message.type === "response" && message.requestId === requestId2) {
            if (message.resultType !== "success" || typeof message.result?.clientId !== "string")
              return fail(Error("IPC initialization rejected"));
            waiting.delete(reject);
            resolve({ id: message.result.clientId, send, onMessage: (fn) => listener = fn });
          }
          listener?.(message);
        },
        (problem) => fail(Error(problem === "too-large" ? "IPC frame too large" : "Invalid IPC JSON"))
      )
    );
  });
  try {
    const observer = await connect();
    const sender = await connect();
    for (const queryKey of queryKeys)
      await new Promise((resolve, reject) => {
        const invalidate = { queryKey, reset: false };
        if (failure) return reject(failure);
        waiting.add(reject);
        observer.onMessage((message) => {
          if (message.type === "broadcast" && message.method === "query-cache-invalidate" && message.version === 0 && message.sourceClientId === sender.id && JSON.stringify(message.params) === JSON.stringify(invalidate)) {
            waiting.delete(reject);
            resolve();
          }
        });
        sender.send({
          type: "broadcast",
          method: "query-cache-invalidate",
          version: 0,
          sourceClientId: sender.id,
          params: invalidate,
          ...observerOnly ? { targetClientIds: [observer.id] } : {}
        });
      });
    return {
      socketPath,
      handshakeConfirmed: true,
      relayConfirmed: true,
      hostRefreshRequested: !observerOnly,
      queryKeys
    };
  } finally {
    clearTimeout(deadline);
    for (const socket of sockets) {
      socket.removeAllListeners("close");
      socket.destroy();
    }
  }
}
async function assertPrivateSocket(socketPath) {
  if (process.platform === "win32") {
    if (!socketPath.startsWith("\\\\.\\pipe\\")) throw Error("Expected a local Windows named pipe");
    return;
  }
  const [file, directory] = await Promise.all([lstat(socketPath), lstat(path5.dirname(socketPath))]);
  const uid = process.getuid?.();
  if (uid == null || file.uid !== uid || directory.uid !== uid || !file.isSocket() || !directory.isDirectory() || directory.mode & 18)
    throw Error("IPC socket must belong to the current user in a protected directory");
}

// src/hosts/result.ts
var hash = (value) => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
function validateHostResult(state, operationId, input, target2) {
  const pending = pendingFor(state, operationId);
  const binding = state.pet?.binding;
  if (!binding) throw new Error("Bind the actual host target before recording an update");
  if (input.petId !== pending.petId || input.operationId !== operationId)
    throw new Error("Host result belongs to another pet or operation");
  if (input.appearanceId !== desiredAppearance(state)?.id)
    throw new Error("Host result belongs to a different appearance");
  const avatarId = text(input.avatarId, "avatarId");
  if (avatarId !== (target2?.avatarId ?? binding.cloudId ?? binding.avatarId))
    throw new Error("Host updated a different Avatar from the actual bound target");
  if (typeof input.updated !== "boolean" || ![true, false, null].includes(input.storedArtworkVerified) || ![true, false, null].includes(input.active) || typeof input.refreshRequested !== "boolean" || !["confirmed", "unconfirmed"].includes(input.displayStatus))
    throw new Error("Invalid host result");
  if (input.storedArtworkVerified === true && (!input.updated || !hash(input.acceptedArtworkSha256) || !hash(input.storedArtworkSha256) || input.acceptedArtworkSha256 !== input.storedArtworkSha256 || !input.observed?.trim()))
    throw new Error("Verified stored artwork requires matching runtime readback hashes and observed host facts");
  if (input.refreshUnavailable !== void 0 && typeof input.refreshUnavailable !== "boolean")
    throw new Error("Invalid host result");
  if (input.refreshUnavailable && !input.notice?.trim()) throw new Error("refreshUnavailable requires a notice");
  if (input.displayStatus === "confirmed")
    throw new Error(
      "The available host interfaces provide no evidence of the displayed image; keep displayStatus unconfirmed"
    );
  return {
    petId: input.petId,
    operationId,
    appearanceId: input.appearanceId,
    avatarId,
    ...target2?.cloudId ? { cloudId: target2.cloudId } : input.cloudId ? { cloudId: text(input.cloudId, "cloudId") } : {},
    updated: input.updated,
    storedArtworkVerified: input.storedArtworkVerified,
    active: input.active,
    refreshRequested: input.refreshRequested,
    displayStatus: input.displayStatus,
    ...input.acceptedArtworkSha256 ? { acceptedArtworkSha256: input.acceptedArtworkSha256 } : {},
    ...input.storedArtworkSha256 ? { storedArtworkSha256: input.storedArtworkSha256 } : {},
    ...input.acceptedFileSha256 ? { acceptedFileSha256: input.acceptedFileSha256 } : {},
    ...input.storedFileSha256 ? { storedFileSha256: input.storedFileSha256 } : {},
    ...input.refreshUnavailable ? { refreshUnavailable: true, notice: text(input.notice, "notice") } : {},
    ...input.observed ? { observed: text(input.observed, "observed") } : {},
    ...input.error ? { error: text(input.error, "error") } : {}
  };
}
async function recordHostResult(store2, operationId, input, options = {}) {
  return store2.transaction(async (state) => {
    const pending = pendingFor(state, operationId);
    if (!pending.plan?.appearance) throw new Error("No planned appearance update");
    const art = desiredAppearance(state);
    if (!art) throw new Error("Complete or select appearance artwork first");
    if (!state.pet.binding) throw new Error("Bind the actual host target before recording an update");
    const target2 = await findAvatar(state, options);
    if (!target2.avatarId) throw new Error(target2.reason ?? "Host target is unknown");
    if (input.avatarId !== target2.avatarId)
      throw new Error("Host updated a different Avatar from the actual bound target");
    if (input.storedArtworkVerified === true && !input.readbackFile)
      throw new Error("Stored artwork must be checked from an actual host readback file");
    if (input.readbackFile && path6.resolve(input.readbackFile) === path6.resolve(art.file))
      throw new Error("Host readback must be a separate file retrieved from the host");
    const checks = input.readbackFile ? await verifyStoredArtwork(art.file, input.readbackFile) : { storedArtworkVerified: null };
    if (target2.cloudId) state.pet.binding.cloudId = target2.cloudId;
    let resultInput = {
      ...input,
      ...checks,
      ...state.host === "desktop" ? { active: target2.active } : {}
    };
    if (state.host === "desktop" && target2.cloudId && checks.storedArtworkVerified === true && input.updated) {
      const refresh = await (options.refresh ?? refreshNativePet)({
        expectedSpritePath: art.file,
        cloudId: target2.cloudId
      });
      delete resultInput.refreshUnavailable;
      delete resultInput.notice;
      resultInput = {
        ...resultInput,
        refreshRequested: refresh.refreshRequested,
        displayStatus: "unconfirmed",
        observed: `${input.observed ?? ""} Cloud Pet artwork was independently compared with accepted pixels. ${refresh.notice}`.trim(),
        ...!refresh.automaticRefresh && target2.active !== false ? {
          refreshUnavailable: true,
          notice: "Cloud artwork was uploaded and verified; desktop resource refresh is unavailable. The updated artwork will load when this Pet is next fetched."
        } : {}
      };
    }
    return pending.hostResult = validateHostResult(state, operationId, resultInput, target2);
  });
}

// src/hosts/desktop/publish.ts
function desktopDestination(state) {
  if (!state.pet) throw new Error("No pet");
  const pets = path7.resolve(codexHome(), "pets");
  const destination = path7.resolve(state.pet.binding?.destination ?? path7.join(pets, state.pet.id));
  const relative = path7.relative(pets, destination);
  if (!relative || relative.startsWith("..") || path7.isAbsolute(relative) || relative.includes(path7.sep))
    throw new Error("Target must be one entry in this Codex home");
  const localId = `custom:${path7.basename(destination)}`;
  if (state.pet.binding?.avatarId.startsWith("custom:") && state.pet.binding.avatarId !== localId)
    throw new Error("Avatar binding does not match its destination");
  return destination;
}
var desktopLabel = (petId2) => petId2.slice(0, "genpet-".length + 6);
async function exportNative(state, destination) {
  if (!state.pet || state.host !== "desktop") throw new Error("Native export requires a desktop pet");
  if (!path7.isAbsolute(destination)) throw new Error("Local export requires an absolute destination");
  if (state.pet.binding && path7.resolve(destination) !== desktopDestination(state))
    throw new Error("Local export must use the bound Pet destination");
  const art = desiredAppearance(state);
  if (!art || art.kind !== "atlas") throw new Error("Complete or select a validated atlas first");
  await validateArt(art.file);
  let previous;
  try {
    previous = await readFile6(path7.join(destination, "pet.json"), "utf8");
    const old = JSON.parse(previous);
    const boundHere = state.pet.binding?.destination === destination;
    const ours = old.genpetId === state.pet.id || boundHere && state.replacesPetId && old.genpetId === state.replacesPetId || boundHere && state.legacy && !old.genpetId;
    if (!ours) throw new Error("Target entry belongs to another pet; it was preserved");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  await mkdir(destination, { recursive: true });
  const bytes = await readFile6(art.file);
  const spritesheetPath = `spritesheet-${createHash4("sha256").update(bytes).digest("hex").slice(0, 16)}${path7.extname(art.file)}`;
  const tmp = path7.join(destination, `.pending-${randomUUID4()}`);
  await copyFile(art.file, tmp);
  await rename(tmp, path7.join(destination, spritesheetPath));
  const manifest = {
    id: path7.basename(destination),
    genpetId: state.pet.id,
    displayName: desktopLabel(state.pet.id),
    description: briefForPet(state.pet),
    spriteVersionNumber: 2,
    spritesheetPath
  };
  if (previous) {
    await writeFile(path7.join(destination, `previous-pet-${Date.now()}-${randomUUID4()}.json`), previous);
    await writeFile(path7.join(destination, "previous-pet.json"), previous);
  }
  const manifestTmp = path7.join(destination, `.pet-${randomUUID4()}.json`);
  await writeFile(manifestTmp, JSON.stringify(manifest, null, 2));
  await rename(manifestTmp, path7.join(destination, "pet.json"));
  const readback = JSON.parse(await readFile6(path7.join(destination, "pet.json"), "utf8"));
  if (readback.genpetId !== state.pet.id || readback.spritesheetPath !== spritesheetPath)
    throw new Error("Host local manifest readback does not match the intended Pet");
  const checks = await verifyStoredArtwork(art.file, path7.join(destination, readback.spritesheetPath));
  return { destination, manifest, artId: art.id, filesCommitted: true, ...checks };
}
async function installNative(store2, options = {}) {
  if (store2.host !== "desktop") throw new Error("Use the shared cloud Pet appearance interface in this environment");
  return store2.transaction(async (state) => {
    if (!state.pending?.plan?.appearance) throw new Error("No planned appearance update");
    const pending = pendingFor(state, state.pending.id);
    const lookup = { selection: options.selection, mapping: options.mapping ?? (() => readMigrationMap()) };
    let target2 = await findAvatar(state, lookup);
    if (!target2.avatarId) throw new Error(target2.reason ?? "Host target is unknown");
    if (target2.cloudId) {
      state.pet.binding = {
        ...state.pet.binding,
        host: "desktop",
        avatarId: target2.localAvatarId ?? target2.cloudId,
        cloudId: target2.cloudId
      };
      const request = await cloudAppearanceRequest(state, target2);
      state.pending.hostResult = validateHostResult(state, pending.id, request, target2);
      return request;
    }
    const destination = desktopDestination(state);
    const result = await exportNative(state, destination);
    const avatarId = `custom:${path7.basename(destination)}`;
    state.pet.binding = { host: "desktop", avatarId, destination };
    if (target2.mappingAvailable) {
      target2 = await findAvatar(state, lookup);
      if (!target2.avatarId) throw new Error(target2.reason ?? "Host target is unknown");
      if (target2.cloudId) {
        state.pet.binding.cloudId = target2.cloudId;
        const request = await cloudAppearanceRequest(state, target2);
        state.pending.hostResult = validateHostResult(state, pending.id, request, target2);
        return { local: result, ...request };
      }
    }
    const selection = await (options.selection ?? readSelectedPet)();
    const active = selection.available ? target2.aliases.includes(selection.effectiveSelectedPetId ?? "") : null;
    const refresh = await (options.refresh ?? refreshNativePet)({
      expectedSpritePath: path7.join(destination, result.manifest.spritesheetPath)
    });
    const mustRefresh = active === true || active === null && isLiveDestination(destination);
    const hostResult2 = validateHostResult(
      state,
      pending.id,
      {
        petId: pending.petId,
        operationId: pending.id,
        appearanceId: result.artId,
        avatarId,
        updated: true,
        ...result,
        active,
        refreshRequested: refresh.refreshRequested,
        displayStatus: "unconfirmed",
        observed: `Local host manifest and sprite were independently read back. ${refresh.notice}`,
        ...mustRefresh && !refresh.automaticRefresh ? {
          refreshUnavailable: true,
          notice: `Local host artwork was verified; refresh delivery is unavailable (${refresh.errors?.join("; ") || "no live app channel"}). It will load when the host next reads this entry.`
        } : {}
      },
      target2
    );
    state.pending.hostResult = hostResult2;
    return { ...result, ...hostResult2, refresh };
  });
}

// src/hosts/diagnose.ts
import { access, readFile as readFile7 } from "node:fs/promises";
import path8 from "node:path";
async function diagnose(store2, options = {}) {
  const state = await store2.peek();
  const home = options.home ?? codexHome();
  const target2 = state.pet ? await findAvatar(state, options) : null;
  const selected = target2?.selection;
  const catalog = state.host === "desktop" ? await listPets(home) : null;
  let refresh = {
    available: false,
    error: "No desktop IPC in this environment"
  };
  if (state.host === "desktop" && options.ipcSocketPath !== null && process.env.GENPET_SKIP_NATIVE_REFRESH !== "1") {
    try {
      refresh = {
        available: true,
        observed: await probeIpc(options.ipcSocketPath ?? void 0, options.timeoutMs ?? 1500)
      };
    } catch (error) {
      refresh = { available: false, error: error.message };
    }
  }
  let localArtwork = null;
  const destination = state.pet?.binding?.destination;
  const art = state.art.find(
    (art2) => art2.id === state.pet?.state.appearanceId && art2.petId === state.pet.id && art2.kind === "atlas"
  );
  const acceptedArtwork = art ? await artworkFingerprint(art.file).then(
    (checks) => ({ appearanceId: art.id, file: art.file, ...checks }),
    (error) => ({ appearanceId: art.id, file: art.file, error: error.message })
  ) : null;
  if (destination && art) {
    try {
      const manifest = JSON.parse(await readFile7(path8.join(destination, "pet.json"), "utf8"));
      if (typeof manifest.spritesheetPath !== "string" || path8.basename(manifest.spritesheetPath) !== manifest.spritesheetPath)
        throw Error("Invalid local Pet sprite path");
      localArtwork = await verifyStoredArtwork(art.file, path8.join(destination, manifest.spritesheetPath));
    } catch (error) {
      localArtwork = { storedArtworkVerified: null, error: error.message };
    }
  }
  const recordExists = await access(store2.file).then(
    () => true,
    () => false
  );
  return {
    record: {
      exists: recordExists,
      file: store2.file,
      version: state.version,
      petId: state.pet?.id ?? null,
      pendingOperationId: state.pending?.id ?? null
    },
    target: target2,
    catalog,
    selected: selected?.available ? { available: true, id: selected.effectiveSelectedPetId } : {
      available: false,
      id: null,
      error: selected && !selected.available ? selected.reason : "No Pet record; use selectedAvatar for host selection"
    },
    acceptedArtwork,
    localArtwork,
    refresh,
    schedule: { saved: state.schedule ?? null, hostConfirmed: null },
    agentSteps: [
      {
        tool: "list_pets",
        check: "Find the exact actual cloud ID in the host list; preserve selection. Runtime local catalog does not prove cloud presence."
      },
      ...target2?.cloudId && art ? [
        {
          tool: "get_pet_download_link",
          arguments: { pet_id: target2.cloudId },
          check: "Read back actual cloud artwork and compare it with the accepted image. A local atlas match proves only local storage."
        }
      ] : [],
      {
        check: "Read the saved schedule reference using the host automation tools; confirm enabled state and target Pet. Repair the same identity only."
      },
      ...acceptedArtwork && target2?.avatarId ? [
        {
          command: "repair-appearance",
          check: "Restore this current accepted image to the same target ID. Preserve Pet records, stage and story history."
        }
      ] : []
    ],
    displayStatus: "unconfirmed"
  };
}

// src/hosts/repair.ts
import { randomUUID as randomUUID5 } from "node:crypto";
import { mkdir as mkdir2, readFile as readFile8, writeFile as writeFile2 } from "node:fs/promises";
import path9 from "node:path";
function currentAcceptedArt(state) {
  const art = state.art.find(
    (art2) => art2.id === state.pet?.state.appearanceId && art2.petId === state.pet.id && art2.kind === "atlas"
  );
  if (!art)
    throw new Error("This Pet has no saved current accepted atlas; preserve its records and resume unfinished work");
  if (state.pending?.hostResult?.updated && state.pending.hostResult.appearanceId !== art.id)
    throw new Error("A newer pending appearance is already on the host; resume that story before repairing");
  return art;
}
async function saveReport(store2, petId2, result) {
  const directory = path9.join(store2.root, "pets", petId2, "diagnostics");
  await mkdir2(directory, { recursive: true });
  const reportFile = path9.join(directory, `repair-${Date.now()}-${randomUUID5()}.json`);
  await writeFile2(reportFile, JSON.stringify(result, null, 2), { flag: "wx", mode: 384 });
  return { ...result, reportFile };
}
async function repairAppearance(store2, options = {}) {
  const state = await store2.peek();
  if (!state.pet?.binding) throw new Error("Bind the existing host Pet before repairing its appearance");
  const art = currentAcceptedArt(state);
  await validateArt(art.file);
  const target2 = await findAvatar(state, options);
  if (!target2.avatarId) throw new Error(target2.reason ?? "The actual host Pet target is unknown");
  const fingerprint = await artworkFingerprint(art.file);
  const base = {
    petId: state.pet.id,
    appearanceId: art.id,
    avatarId: target2.avatarId,
    cloudId: target2.cloudId,
    file: art.file,
    acceptedArtworkSha256: fingerprint.artworkSha256,
    active: target2.active,
    preserveCurrentSelection: true,
    displayStatus: "unconfirmed"
  };
  const cloudRequest = (cloudId) => ({
    ...base,
    operation: "repair-cloud-pet",
    avatarId: cloudId,
    cloudId,
    updated: false,
    storedArtworkVerified: null,
    refreshRequested: false,
    agentSteps: cloudUploadSteps(art.file, cloudId, {
      command: "repair-result",
      petId: state.pet.id,
      check: "Save avatarId, appearanceId, updated, readbackFile and observed host facts to an absolute JSON file. Runtime verifies the actual host image; no new story is created."
    })
  });
  if (target2.cloudId) return saveReport(store2, state.pet.id, cloudRequest(target2.cloudId));
  const local = await exportNative({ ...state, pending: null }, desktopDestination(state));
  const after = await findAvatar(state, options);
  if (!after.avatarId) throw new Error(after.reason ?? "The host target changed during repair");
  if (after.cloudId) return saveReport(store2, state.pet.id, { local, ...cloudRequest(after.cloudId) });
  const refresh = await (options.refresh ?? refreshNativePet)({
    expectedSpritePath: path9.join(local.destination, local.manifest.spritesheetPath)
  });
  return saveReport(store2, state.pet.id, {
    ...base,
    operation: "repair-local-pet",
    updated: true,
    ...local,
    refreshRequested: refresh.refreshRequested,
    refresh,
    observed: "The existing accepted image was written to this same local Pet and independently read back."
  });
}
async function repairResult(store2, petId2, input, options = {}) {
  const state = await store2.peek();
  if (state.pet?.id !== petId2) throw new Error("Repair result belongs to a different Pet");
  const art = currentAcceptedArt(state);
  const target2 = await findAvatar(state, options);
  if (!target2.avatarId || input.avatarId !== target2.avatarId || input.appearanceId !== art.id)
    throw new Error("Repair result does not match the current accepted image and actual host Pet");
  if (typeof input.updated !== "boolean" || typeof input.observed !== "string" || !input.observed.trim())
    throw new Error("Repair requires observed host update facts");
  if (!path9.isAbsolute(input.readbackFile) || path9.resolve(input.readbackFile) === path9.resolve(art.file))
    throw new Error("Repair requires a separate absolute host readback file");
  const checks = await verifyStoredArtwork(art.file, input.readbackFile);
  const refresh = state.host === "desktop" && checks.storedArtworkVerified && input.updated ? await (options.refresh ?? refreshNativePet)({
    expectedSpritePath: art.file,
    ...target2.cloudId ? { cloudId: target2.cloudId } : {}
  }) : null;
  return saveReport(store2, petId2, {
    petId: petId2,
    appearanceId: art.id,
    avatarId: target2.avatarId,
    cloudId: target2.cloudId,
    updated: input.updated,
    ...checks,
    active: target2.active,
    refreshRequested: refresh?.refreshRequested ?? input.refreshRequested ?? false,
    displayStatus: "unconfirmed",
    observed: input.observed.trim(),
    ...refresh ? { refresh } : {}
  });
}
var repairCommands = {
  "repair-appearance": { usage: "repair-appearance", run: (_, store2) => repairAppearance(store2) },
  "repair-result": {
    usage: "repair-result PET_ID RESULT_JSON_FILE",
    run: async (args2, store2) => {
      if (!args2[0] || !args2[1] || !path9.isAbsolute(args2[1]))
        throw new Error("repair-result requires a Pet ID and an absolute result JSON file");
      return repairResult(store2.forPet(args2[0]), args2[0], JSON.parse(await readFile8(args2[1], "utf8")));
    }
  }
};

// src/hosts/desktop/index.ts
var desktop = {
  appearanceKind: "atlas",
  artContract: ATLAS_CONTRACT,
  validateArt,
  findAvatar,
  selectedAvatar,
  setAppearance: installNative,
  diagnose,
  commands: {
    ...repairCommands,
    publish: { usage: "publish", run: (_, store2) => installNative(store2) },
    "switch-pet": { usage: "switch-pet [PET_ID|--current|--list|--help]", run: (args2) => switchPet(args2) }
  }
};

// src/hosts/cloud.ts
async function bindCloud(store2, cloudId) {
  const id = text(cloudId, "cloudId");
  if (!isCloudId(id)) throw new Error("Bind an existing pet_ cloud Pet ID");
  return store2.transaction(async (state) => {
    if (!state.pet) throw new Error("Allocate the pet identity first");
    const old = state.pet.binding;
    if (state.host === "desktop" && old?.avatarId.startsWith("custom:")) {
      const target2 = await findAvatar(state);
      if (target2.cloudId !== id)
        throw new Error("The fresh host migration mapping must confirm this local/cloud binding");
    }
    if (old?.cloudId && old.cloudId !== id) throw new Error("Target is already bound; preserve the existing cloud Pet");
    if (old && isCloudId(old.avatarId) && old.avatarId !== id)
      throw new Error("Target is already bound; preserve the existing cloud Pet");
    return state.pet.binding = { ...old, host: state.host, avatarId: old?.avatarId ?? id, cloudId: id };
  });
}
async function setCloudAppearance(store2, options = {}) {
  return store2.transaction(async (state) => {
    const target2 = await findAvatar(state, options);
    const request = await cloudAppearanceRequest(state, target2);
    state.pending.hostResult = validateHostResult(state, request.operationId, request, target2);
    return request;
  });
}
var cloud = {
  appearanceKind: "atlas",
  artContract: ATLAS_CONTRACT,
  validateArt,
  findAvatar,
  selectedAvatar,
  setAppearance: setCloudAppearance,
  diagnose,
  commands: {
    "bind-cloud": { usage: "bind-cloud CLOUD_PET_ID", run: (args2, store2) => bindCloud(store2, args2[0]) },
    ...repairCommands
  }
};

// src/hosts/index.ts
function hostFor(host2) {
  const adapter = { desktop, cloud }[host2];
  if (!adapter) throw new Error("Unsupported host environment");
  return adapter;
}

// src/art.ts
function artRequest(state) {
  if (!state.pet || !state.pending?.plan) return null;
  const pet = state.pet;
  const plan = state.pending.plan;
  return {
    id: requestId(state),
    operationId: state.pending.id,
    petId: pet.id,
    host: state.host,
    status: !plan.appearance ? "unchanged" : desiredAppearance(state) ? "ready" : "pending",
    stage: plan.stage,
    name: pet.name,
    naming: pet.naming,
    personality: pet.soul.personality ?? plan.personality,
    genes: pet.soul.genes ?? plan.genes,
    story: plan.text,
    appearance: plan.appearance,
    // The Agent chooses identity references and reusable appearances from this pet's accepted art.
    savedArt: state.art.filter((art) => art.petId === pet.id),
    prompt: readPrompt("meta") + "\n" + readPrompt("appearance"),
    contract: hostFor(state.host).artContract,
    target: pet.binding ?? null
  };
}
async function validateImage(file, kind) {
  const info = await stat3(file);
  if (!info.isFile() || info.size > 64 * 1024 * 1024) throw new Error("Artifact must be a regular file below 64 MiB");
  if (kind === "artifact") return { format: "artifact", width: 0, height: 0, hasAlpha: false };
  const meta = await readImageInfo(file);
  if ((kind === "portrait" || kind === "atlas") && !meta.hasAlpha)
    throw new Error("Pet images must have an alpha channel");
  if (meta.width * meta.height > 16e6) throw new Error("Image exceeds size limit");
  const decoded = await decodeRgba(file);
  if (kind === "atlas") await hostFor("desktop").validateArt(file);
  return meta;
}
async function acceptArt(store2, input) {
  if (typeof input.requestId !== "string" || !input.requestId.trim())
    throw new Error("accept-art REQUEST_ID must be a non-empty string from art-request.id");
  if (typeof input.file !== "string" || !path10.isAbsolute(input.file))
    throw new Error("Artifact file must be an absolute local path");
  if (!artKinds.includes(input.kind)) throw new Error("Unknown artifact kind");
  if (!input.source?.trim()) throw new Error("Record generation and validation source");
  await validateImage(input.file, input.kind);
  const bytes = await readFile9(input.file);
  return store2.transaction(async (state) => {
    if (requestId(state) !== input.requestId) throw new Error("Stale design request");
    const appearanceKind = hostFor(state.host).appearanceKind;
    if ((input.kind === "atlas" || input.kind === "avatar") && input.kind !== appearanceKind)
      throw new Error("Artwork uses the other host format");
    const pet = state.pet;
    const plan = state.pending.plan;
    const id = `art-${createHash5("sha256").update(pet.id + input.requestId + input.kind).update(bytes).digest("hex").slice(0, 24)}`;
    const previous = state.art.find((art) => art.id === id);
    if (previous) {
      await stat3(previous.file);
      return previous;
    }
    const dir = path10.join(store2.root, "pets", pet.id, "assets");
    await mkdir3(dir, { recursive: true, mode: 448 });
    const file = path10.join(dir, id + path10.extname(input.file).toLowerCase());
    const tmp = `${file}.${randomUUID6()}.tmp`;
    try {
      await writeFile3(tmp, bytes, { mode: 384, flag: "wx" });
      await rename2(tmp, file);
    } finally {
      await rm(tmp, { force: true });
    }
    const record2 = {
      id,
      petId: pet.id,
      requestId: input.requestId,
      stage: plan.stage,
      description: input.description?.trim() || plan.appearance?.description || plan.state,
      file,
      kind: input.kind,
      createdAt: Date.now(),
      source: input.source
    };
    state.art.push(record2);
    return record2;
  });
}

// src/chat.ts
import { randomUUID as randomUUID7 } from "node:crypto";
async function noteChat(store2, petId2, note) {
  identifier(petId2, "petId");
  const brief = text(note, "chat note");
  if (brief.length > 1e3) throw new Error("A chat note is a brief record of at most 1000 characters");
  return store2.transaction((state) => {
    if (!state.pet || state.pet.id !== petId2) throw new Error("Chat note belongs to another or missing pet");
    const chat = { id: `chat-${randomUUID7()}`, petId: petId2, at: Date.now(), text: brief };
    (state.chats ??= []).push(chat);
    return chat;
  });
}

// src/debugger.ts
import { spawn } from "node:child_process";
import path13 from "node:path";

// src/store.ts
import { mkdir as mkdir5, readFile as readFile11, readdir as readdir2, rename as rename3, writeFile as writeFile4, rm as rm2, stat as stat4 } from "node:fs/promises";
import path12 from "node:path";
import { randomUUID as randomUUID8 } from "node:crypto";

// src/growth.ts
var HOUR = 36e5;
var DAY = 24 * HOUR;
var STAGE_CEILING = { egg: 5 * HOUR, hatchling: 7 * DAY, juvenile: 7 * DAY };
var SPECIAL_INTERVAL = 7 * DAY;
var SPECIAL_DURATION = 2 * DAY;
var EXPERIENCES_TO_GROW = 5;
var iso = (time) => new Date(time).toISOString();
function stageOrigin(state) {
  const pet = state.pet;
  const origin = state.legacy?.importedAt ?? pet.adoptedAt;
  if (pet.state.stage === "egg") return origin;
  const times = state.stories.filter((story) => story.petId === pet.id && story.stage === pet.state.stage).map((story) => story.at);
  return times.length ? Math.min(...times) : origin;
}
function initialClock(state) {
  const pet = state.pet;
  const special = pet.state.special;
  return {
    stage: pet.state.stage,
    stageSince: stageOrigin(state),
    experiences: 0,
    pausedMs: 0,
    stagePausedMs: 0,
    specialPausedMs: 0,
    ...special ? { specialSince: special.endedAt ?? special.since } : {}
  };
}
function ensureGrowthClock(state) {
  if (!state.pet) return null;
  return state.growthClock ??= initialClock(state);
}
function pausedTime(state, now = Date.now()) {
  const clock = state.growthClock;
  return clock ? clock.pausedMs + (clock.pausedAt === void 0 ? 0 : Math.max(0, now - clock.pausedAt)) : 0;
}
function commitExperience(state, storyId, memoryText, at = Date.now(), count = true) {
  const pet = state.pet;
  if (!pet) throw new Error("No Pet to remember this story");
  const id = identifier(storyId, "memory storyId");
  const value = text(memoryText, "memory");
  if (pet.memory.storyId === id || pet.memory.text === value || state.stories.some((story) => story.id === id))
    return false;
  const clock = ensureGrowthClock(state);
  pet.memory = { text: value, updatedAt: at, storyId: id };
  if (count && state.pending?.mode !== "initialization" && clock.lastExperienceStoryId !== id) {
    clock.experiences++;
    clock.lastExperienceStoryId = id;
  }
  return true;
}
function stageAdvance(state, at = Date.now()) {
  const pet = state.pet;
  if (!pet) return;
  const clock = ensureGrowthClock(state);
  const totalPaused = pausedTime(state, at);
  if (clock.stage !== pet.state.stage) {
    clock.stage = pet.state.stage;
    clock.stageSince = at;
    clock.experiences = 0;
    delete clock.lastExperienceStoryId;
    clock.stagePausedMs = totalPaused;
    clock.specialPausedMs = totalPaused;
  }
  const specialSince = pet.state.special ? pet.state.special.endedAt ?? pet.state.special.since : void 0;
  if (clock.specialSince !== specialSince) {
    clock.specialSince = specialSince;
    clock.specialPausedMs = totalPaused;
  }
}
function growth(state, now = Date.now()) {
  const pet = state.pet;
  if (!pet?.soul.genes || state.needsImport) return null;
  const clock = state.growthClock ?? initialClock(state);
  const since = clock.stage === pet.state.stage ? clock.stageSince : stageOrigin(state);
  const paused = pausedTime(state, now);
  const stagePause = Math.max(0, paused - clock.stagePausedMs);
  const ceiling = STAGE_CEILING[pet.state.stage];
  const deadline = ceiling === void 0 ? null : since + ceiling + stagePause;
  let required = deadline !== null && now >= deadline ? "advance" : null;
  let special = null;
  if (pet.state.stage === "adult") {
    const active = !!pet.state.special && pet.state.special.endedAt === void 0;
    const start = active ? pet.state.special.since : Math.max(since, pet.state.special?.endedAt ?? 0);
    const specialPause = Math.max(0, paused - clock.specialPausedMs);
    const due = start + (active ? SPECIAL_DURATION : SPECIAL_INTERVAL) + specialPause;
    if (now >= due) required = active ? "end-special" : "enter-special";
    special = {
      active,
      ...active ? { description: pet.state.special.description } : {},
      since: iso(start),
      ...active ? { endBy: iso(due) } : { enterBy: iso(due) }
    };
  }
  const experiences = clock.stage === pet.state.stage ? clock.experiences : 0;
  return {
    stage: pet.state.stage,
    next: stages[stages.indexOf(pet.state.stage) + 1] ?? null,
    since: iso(since),
    advanceBy: deadline === null ? null : iso(deadline),
    experiences,
    canAdvance: pet.state.stage !== "adult" && (required === "advance" || experiences >= EXPERIENCES_TO_GROW),
    paused: clock.pausedAt !== void 0,
    special,
    required
  };
}

// src/migration.ts
import { copyFile as copyFile2, mkdir as mkdir4, readFile as readFile10 } from "node:fs/promises";
import path11 from "node:path";
import { createHash as createHash6 } from "node:crypto";
var object = (value) => !!value && typeof value === "object" && !Array.isArray(value);
var number = (value, fallback) => typeof value === "number" && Number.isFinite(value) ? value : fallback;
var optionalText = (value, field) => value === void 0 || value === null ? void 0 : text(value, field);
function savedAliases(value) {
  if (Array.isArray(value)) return value.map(savedAliases);
  if (!object(value)) return value;
  const result = {};
  const aliases = {
    basis: "reason",
    designBasis: "designReason",
    provenance: "source",
    evidence: "observed",
    evidenceIds: "factIds"
  };
  for (const [key2, item] of Object.entries(value)) {
    const target2 = aliases[key2] ?? key2;
    if (target2 !== key2 && Object.hasOwn(value, target2)) continue;
    result[target2] = savedAliases(item);
  }
  if (result.unit === "carrier") result.unit = "story-item";
  if (result.unit === "image-review") result.unit = "ImageReviewer";
  return result;
}
function hostResult(input) {
  if (!object(input)) return void 0;
  const result = savedAliases(input);
  const verified = result.storedArtworkVerified === true && typeof result.acceptedArtworkSha256 === "string" && result.acceptedArtworkSha256 === result.storedArtworkSha256;
  result.storedArtworkVerified = verified ? true : result.storedArtworkVerified === false ? false : null;
  return result;
}
function normalizeStep(step) {
  return savedAliases(step);
}
function normalizeRecord(input, host2, file, importing = false) {
  if (!object(input) || ![1, 2, 3].includes(input.version)) throw new Error("Unsupported pet record");
  const old = input.version !== 3;
  const sourceHost = input.host === "dots" ? "cloud" : input.host;
  if (input.version !== 1 && sourceHost !== host2 && !importing) throw new Error("Mismatched pet record host");
  const record2 = savedAliases(input);
  const result = { ...fresh(host2), ...record2, version: 3, host: host2 };
  if (record2.pet) {
    const source = record2.pet;
    const adoptedAt = number(source.adoptedAt, number(record2.legacy?.importedAt, 0));
    const state = source.state ?? {};
    const shell = createPet(source.name ?? source.profile?.name ?? "GenPet", adoptedAt);
    const soul = source.soul ?? {
      genes: source.genes ?? null,
      personality: source.personality,
      acquisition: source.acquisition
    };
    result.pet = {
      ...shell,
      id: identifier(source.id, "petId"),
      revision: number(source.revision, 0),
      ...source.naming ? { naming: { ...source.naming, status: source.naming.status === "deferred" ? "asked" : source.naming.status } } : {},
      soul: {
        ...soul,
        genes: soul.genes === null || soul.genes === void 0 ? null : text(soul.genes, "genes"),
        ...optionalText(soul.personality, "personality") ? { personality: soul.personality } : {}
      },
      memory: source.memory ? { ...source.memory } : { text: "", updatedAt: number(state.updatedAt, adoptedAt) },
      state: {
        ...state,
        stage: validateStage("egg", state.stage ?? source.stage),
        description: state.description ?? state.reason ?? "",
        updatedAt: number(state.updatedAt, adoptedAt),
        ...source.home !== void 0 && state.home === void 0 ? { home: source.home } : {},
        ...source.special !== void 0 && state.special === void 0 ? { special: source.special } : {}
      },
      ...source.binding ? {
        binding: {
          ...source.binding,
          host: source.binding.host === "dots" || importing ? host2 : source.binding.host
        }
      } : {}
    };
    if (result.pet.naming && !["unasked", "asked", "named"].includes(result.pet.naming.status))
      throw new Error("Invalid naming status");
    if (typeof result.pet.memory.text !== "string") throw new Error("Invalid memory");
  } else result.pet = null;
  result.stories = (record2.stories ?? []).map((story) => ({
    ...story,
    reason: story.reason ?? "Legacy story; its reason was not recorded",
    mediaIds: story.mediaIds ?? [],
    ...story.hostResult ? { hostResult: hostResult(story.hostResult) } : {},
    ...story.steps ? { steps: story.steps.map(normalizeStep) } : {}
  }));
  result.art = (record2.art ?? []).map((art) => ({ ...art, source: art.source ?? "Preserved legacy artwork" }));
  if (result.pending) {
    if (result.pending.hostResult) result.pending.hostResult = hostResult(result.pending.hostResult);
    if (result.pending.steps) result.pending.steps = result.pending.steps.map(normalizeStep);
  }
  if (old) {
    result.needsImport = true;
    if (file) result.legacyFile = file;
  }
  return result;
}
async function findLegacyRecord(store2) {
  const candidates = [path11.join(store2.root, "state.json")];
  if (store2.host === "desktop") candidates.push(path11.join(store2.base, "state.json"));
  else candidates.push(path11.join(store2.base, "dots", "state.json"));
  for (const file of candidates) {
    try {
      const old = JSON.parse(await readFile10(file, "utf8"));
      if ([1, 2].includes(old.version) && old.pet) return file;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  return null;
}
async function inspectLegacyRecords(base) {
  const files = ["state.json", "desktop/state.json", "cloud/state.json", "dots/state.json"].map(
    (file) => path11.join(base, file)
  );
  const found = [];
  for (const file of files) {
    let bytes;
    try {
      bytes = await readFile10(file, "utf8");
    } catch (error) {
      if (error.code !== "ENOENT")
        found.push({ file, problem: `Record read failed (${error.code ?? "unknown"})` });
      continue;
    }
    try {
      const record2 = JSON.parse(bytes);
      if (!object(record2) || ![1, 2].includes(record2.version)) continue;
      found.push({
        file,
        version: record2.version,
        ...typeof record2.pet?.id === "string" ? { petId: record2.pet.id } : {},
        ...typeof record2.host === "string" ? { host: record2.host } : {}
      });
    } catch {
      found.push({ file, problem: "Record is not valid JSON; preserved for explicit review" });
    }
  }
  return found;
}
async function prepareImport(store2, file, options, now) {
  if (!options.confirmed) throw new Error("Import requires explicit user confirmation");
  if (!path11.isAbsolute(file)) throw new Error("Legacy file must be absolute");
  const bytes = await readFile10(file);
  const original = JSON.parse(bytes.toString("utf8"));
  if (![1, 2, 3].includes(original.version) || !original.pet) throw new Error("No Pet to import");
  const state = normalizeRecord(original, store2.host, file, true);
  const pet = state.pet;
  if (original.version === 1) {
    pet.soul.genes = text(options.genes, "observed legacy identity");
    pet.soul.acquisition = {
      place: text(options.place, "origin"),
      connection: text(options.connection, "connection"),
      storyId: "legacy"
    };
    const destination = original.nativeExport?.destination;
    if (destination)
      pet.binding = {
        host: store2.host,
        avatarId: original.nativeExport?.avatarId ?? `custom:${path11.basename(destination)}`,
        destination,
        ...original.nativeExport?.cloudId ? { cloudId: original.nativeExport.cloudId } : {}
      };
    state.art = state.art.map((art) => ({
      ...art,
      id: art.id ?? `art-${createHash6("sha256").update(JSON.stringify([art.file, art.kind, art.stage, art.createdAt])).digest("hex").slice(0, 24)}`,
      petId: pet.id,
      requestId: art.requestId ?? "legacy",
      description: art.description ?? "Imported existing artwork",
      stage: validateStage("egg", art.stage),
      createdAt: number(art.createdAt, now)
    }));
  }
  if (options.personality !== void 0 && !pet.soul.personality)
    pet.soul.personality = text(options.personality, "personality");
  if (options.memory !== void 0 && !pet.memory.text)
    pet.memory = { text: text(options.memory, "memory"), updatedAt: now, storyId: "legacy" };
  const digest = createHash6("sha256").update(bytes).digest("hex").slice(0, 16);
  const backup = path11.join(store2.root, "backups", `legacy-v${original.version}-${pet.id}-${digest}.json`);
  await mkdir4(path11.dirname(backup), { recursive: true });
  await copyFile2(file, backup);
  state.legacy = { backup, importedAt: now, source: file, sourceVersion: original.version };
  if (options.memory !== void 0 && pet.memory.storyId === "legacy") state.legacy.memorySupplementedAt = now;
  delete state.needsImport;
  delete state.legacyFile;
  if (original.version !== 3) {
    state.growthClock = {
      stage: pet.state.stage,
      stageSince: now,
      experiences: 0,
      pausedMs: 0,
      stagePausedMs: 0,
      specialPausedMs: 0
    };
  }
  for (const art of state.art) {
    if (art.petId !== pet.id || !path11.isAbsolute(art.file)) continue;
    const target2 = path11.join(
      store2.petDirectory(pet.id),
      "assets",
      identifier(art.id, "artId") + path11.extname(art.file)
    );
    if (path11.resolve(art.file) !== path11.resolve(target2)) {
      await mkdir4(path11.dirname(target2), { recursive: true });
      try {
        await copyFile2(art.file, target2);
      } catch (error) {
        if (error.code === "ENOENT") continue;
        throw error;
      }
    }
    art.file = target2;
    if (original.version === 1 && art.kind === "atlas" && art.stage === pet.state.stage)
      pet.state.appearanceId = art.id;
  }
  return state;
}
async function migrateLegacy(store2, file, design) {
  return store2.importRecord(file, { ...design, confirmed: true });
}

// src/store.ts
async function atomicJson(file, value) {
  await mkdir5(path12.dirname(file), { recursive: true, mode: 448 });
  const tmp = `${file}.${randomUUID8()}.tmp`;
  try {
    await writeFile4(tmp, JSON.stringify(value, null, 2) + "\n", { mode: 384, flag: "wx" });
    for (let attempt = 0; ; attempt++) {
      try {
        await rename3(tmp, file);
        break;
      } catch (error) {
        const code = error.code;
        if (process.platform !== "win32" || !["EPERM", "EACCES", "EBUSY"].includes(code ?? "") || attempt >= 4)
          throw error;
        await new Promise((resolve) => setTimeout(resolve, 20 * 2 ** attempt));
      }
    }
  } finally {
    await rm2(tmp, { force: true });
  }
}
async function readJson(file) {
  try {
    const record2 = JSON.parse(await readFile11(file, "utf8"));
    if (record2 === null) throw new Error("Record is null");
    return record2;
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw new Error(`Cannot read Pet record ${file}: ${error instanceof Error ? error.message : String(error)}`);
  }
}
var jsonEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
var key = (id) => encodeURIComponent(identifier(id)).replace(/\./g, "%2E");
var Store = class _Store {
  constructor(root = dataRoot(), host2 = "desktop", petId2) {
    this.host = host2;
    this.base = path12.resolve(root);
    this.root = path12.join(this.base, host2);
    this.registryFile = path12.join(this.root, "registry.json");
    this.pinnedId = petId2 === void 0 ? void 0 : identifier(petId2, "petId");
    this.selectedId = this.pinnedId;
  }
  host;
  base;
  root;
  registryFile;
  selectedId;
  pinnedId;
  get file() {
    return this.selectedId ? path12.join(this.petDirectory(this.selectedId), "state.json") : path12.join(this.root, "current.json");
  }
  petDirectory(id) {
    return path12.join(this.root, "pets", key(id));
  }
  forPet(id) {
    return new _Store(this.base, this.host, id);
  }
  async canonicalIds() {
    try {
      const dirs = await readdir2(path12.join(this.root, "pets"), { withFileTypes: true });
      return dirs.filter((dir) => dir.isDirectory()).map((dir) => identifier(decodeURIComponent(dir.name), "petId"));
    } catch (error) {
      if (error.code === "ENOENT") return [];
      throw error;
    }
  }
  async registry() {
    const raw = await readJson(this.registryFile);
    if (raw) {
      if (raw.version !== 1 || raw.host !== this.host || !Array.isArray(raw.pets))
        throw new Error("Invalid Pet registry");
      for (const pet of raw.pets) {
        identifier(pet.id, "registered petId");
        if (!Number.isFinite(pet.pausedMs) || pet.pausedMs < 0) throw new Error("Invalid activation clock");
      }
      return raw;
    }
    const ids = await this.canonicalIds();
    const records = await Promise.all(
      ids.map((id) => readJson(path12.join(this.petDirectory(id), "state.json")).catch(() => ({ recordError: true })))
    );
    const order = ids.map((id, index) => ({ id, at: records[index]?.pet?.adoptedAt ?? 0 })).filter((_, index) => records[index] !== null).sort((a, b) => a.at - b.at);
    const activePetId = order.at(-1)?.id;
    return {
      version: 1,
      host: this.host,
      ...activePetId ? { activePetId } : {},
      pets: ids.flatMap(
        (id, index) => records[index] === null ? [] : [
          {
            id,
            pausedMs: records[index]?.growthClock?.pausedMs ?? 0,
            ...records[index]?.handoff?.activityTransferId ? { transferId: records[index].handoff.activityTransferId } : {},
            ...records[index]?.growthClock?.pausedAt !== void 0 ? { pausedAt: records[index].growthClock.pausedAt } : {}
          }
        ]
      )
    };
  }
  async readPet(id, registry, allowNew = false, recoverTransfer = false) {
    const file = path12.join(this.petDirectory(id), "state.json");
    const raw = await readJson(file);
    const activity = registry.pets.find((pet) => pet.id === id);
    if (raw === null) {
      if (allowNew && !activity && registry.activePetId !== id) return fresh(this.host);
      throw Object.assign(new Error(`Pet ${id} record is missing: ${file}`), {
        code: "GENPET_RECORD_MISSING",
        registered: !!activity || registry.activePetId === id
      });
    }
    let state;
    try {
      state = normalizeRecord(raw, this.host, file);
      if (state.pet?.id !== id) throw new Error("Pet directory identity mismatch");
    } catch (error) {
      throw new Error(
        `Pet ${id} record is invalid: ${file}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
    const incompleteTransfer = state.handoff?.status === "imported" && state.handoff.activityTransferId !== void 0 && state.handoff.activityTransferId !== activity?.transferId;
    if (incompleteTransfer && !recoverTransfer)
      throw Object.assign(
        new Error(`Pet ${id} transfer activity is not committed: ${file}; resume the same transfer`),
        {
          code: "GENPET_TRANSFER_INCOMPLETE"
        }
      );
    if (activity && state.pet && !incompleteTransfer) {
      const clock = ensureGrowthClock(state);
      clock.pausedMs = activity.pausedMs;
      if (activity.pausedAt !== void 0) clock.pausedAt = activity.pausedAt;
      else delete clock.pausedAt;
      if (activity.lastActivatedAt !== void 0) clock.lastActivatedAt = activity.lastActivatedAt;
      if (activity.lastInactiveAt !== void 0) clock.lastInactiveAt = activity.lastInactiveAt;
    }
    await this.hydrateSteps(state);
    return state;
  }
  async hydrateSteps(state) {
    if (!state.pet) return;
    for (const owner of [...state.stories, ...state.pending ? [state.pending] : []]) {
      if (owner.stepsCount === void 0) continue;
      const file = path12.join(this.petDirectory(state.pet.id), "stories", `${key(owner.id)}.json`);
      if (!Number.isSafeInteger(owner.stepsCount) || owner.stepsCount < 0)
        throw new Error(`Invalid story steps count: ${file}`);
      const saved = await readJson(file);
      if (!saved || saved.petId !== state.pet.id || saved.storyId !== owner.id || !Array.isArray(saved.steps) || saved.steps.length < owner.stepsCount)
        throw new Error(`Story unit snapshot is missing or incomplete: ${file}`);
      owner.steps = saved.steps.slice(0, owner.stepsCount).map(normalizeStep);
    }
  }
  /** No files, registry entries, legacy migrations, or time-based Pet changes are written here. */
  async peek() {
    const registry = await this.registry();
    const id = this.pinnedId ?? registry.activePetId;
    if (id) {
      this.selectedId = id;
      return this.readPet(id, registry);
    }
    this.selectedId = void 0;
    const legacyFile = path12.join(this.root, "state.json");
    const legacy = await readJson(legacyFile);
    if (legacy) return normalizeRecord(legacy, this.host, legacyFile);
    const empty = await readJson(this.file);
    return empty ? normalizeRecord(empty, this.host, this.file) : fresh(this.host);
  }
  async listPets() {
    const registry = await this.registry();
    const ids = [
      .../* @__PURE__ */ new Set([
        ...registry.pets.map((pet) => pet.id),
        ...registry.activePetId ? [registry.activePetId] : [],
        ...await this.canonicalIds()
      ])
    ];
    const result = [];
    for (const id of ids) {
      const entry = registry.pets.find((pet) => pet.id === id);
      const row = {
        id,
        name: id,
        active: registry.activePetId === id,
        archived: !!entry?.archived,
        directory: this.petDirectory(id),
        file: path12.join(this.petDirectory(id), "state.json")
      };
      try {
        const state = await this.readPet(id, registry);
        row.name = state.pet.name;
        row.stage = state.pet.state.stage;
        if (state.pet.binding) row.binding = state.pet.binding;
      } catch (error) {
        row.error = error instanceof Error ? error.message : String(error);
        const raw = await readJson(row.file).catch(() => null);
        try {
          const state = normalizeRecord(raw, this.host, row.file);
          if (state.pet?.id === id) {
            row.name = state.pet.name;
            row.stage = state.pet.state.stage;
            if (state.pet.binding) row.binding = state.pet.binding;
          }
        } catch {
        }
      }
      result.push(row);
    }
    return result;
  }
  /** An operation stays attached to its original Pet even when the host selection changes. */
  async forOperation(id) {
    identifier(id, "operationId");
    const pets = await this.listPets();
    for (const pet of pets) {
      if (pet.error) {
        const raw = await readJson(pet.file).catch(() => null);
        if (raw?.pending?.id === id || Array.isArray(raw?.stories) && raw.stories.some((story) => story.id === id))
          throw new Error(pet.error);
        continue;
      }
      const candidate = this.forPet(pet.id), state = await candidate.peek();
      if (state.pending?.id === id) {
        if (pet.archived) throw new Error("This pending operation belongs to an archived Pet");
        return candidate;
      }
      if (state.stories.some((story) => story.id === id)) return candidate;
    }
    const current = await this.peek();
    if (current.pending?.id === id || current.stories.some((story) => story.id === id)) return this;
    const errors = pets.filter((pet) => pet.error).map((pet) => pet.error);
    throw new Error(
      `Operation belongs to a missing Pet${errors.length ? `; unreadable records: ${errors.join("; ")}` : ""}`
    );
  }
  async readSteps(storyId) {
    const state = await this.peek();
    const owner = state.pending?.id === storyId ? state.pending : state.stories.find((story) => story.id === storyId);
    if (!owner) throw new Error("No story unit snapshot for this Pet");
    return owner.steps ?? [];
  }
  async locked(fn) {
    await mkdir5(this.root, { recursive: true, mode: 448 });
    const lock = this.registryFile + ".lock";
    let acquired = false;
    for (let i = 0; i < 100 && !acquired; i++) {
      try {
        await mkdir5(lock);
        acquired = true;
      } catch (error) {
        if (error.code !== "EEXIST") throw error;
        const age = await stat4(lock).then(
          (info) => Date.now() - info.mtimeMs,
          () => 0
        );
        if (age > 12e4) await rm2(lock, { recursive: true, force: true });
        else await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }
    if (!acquired) throw new Error("Another Pet operation is running; resume it before starting another");
    try {
      return await fn();
    } finally {
      await rm2(lock, { recursive: true, force: true });
    }
  }
  activate(registry, id, now) {
    const current = registry.pets.find((pet) => pet.id === registry.activePetId);
    if (current && current.id !== id && current.pausedAt === void 0) {
      current.pausedAt = now;
      current.lastInactiveAt = now;
    }
    let target2 = registry.pets.find((pet) => pet.id === id);
    if (!target2) {
      target2 = { id, pausedMs: 0 };
      registry.pets.push(target2);
    }
    if (target2.archived) throw new Error("An archived Pet must be explicitly restored before activation");
    if (target2.pausedAt !== void 0) {
      target2.pausedMs += Math.max(0, now - target2.pausedAt);
      delete target2.pausedAt;
    }
    if (registry.activePetId !== id || target2.lastActivatedAt === void 0) target2.lastActivatedAt = now;
    registry.activePetId = id;
  }
  /** Only GenPet's activation ledger changes; this does not change the user's host selection. */
  async selectPet(id, now = Date.now()) {
    identifier(id, "petId");
    return this.locked(async () => {
      const registry = await this.registry(), state = await this.readPet(id, registry);
      if (!state.pet || state.needsImport) throw new Error("No adopted v3 Pet to activate");
      if (!registry.pets.some((pet) => pet.id === id))
        registry.pets.push({
          id,
          pausedMs: state.growthClock?.pausedMs ?? 0,
          ...state.growthClock?.pausedAt !== void 0 ? { pausedAt: state.growthClock.pausedAt } : {}
        });
      this.activate(registry, id, now);
      await atomicJson(this.registryFile, registry);
      this.selectedId = id;
      if (this.pinnedId !== void 0) this.pinnedId = id;
      return { petId: id, active: true };
    });
  }
  async resolveActive(selectedHostId, now = Date.now()) {
    const pets = await this.listPets();
    const migration = selectedHostId && this.host === "desktop" && pets.some((pet) => !pet.archived && pet.binding?.avatarId.startsWith("custom:")) ? await readMigrationMap() : null;
    const matches = selectedHostId ? pets.filter((pet) => {
      const binding = pet.binding;
      if (pet.archived || !binding) return false;
      const cloudId = this.host === "desktop" && binding.avatarId.startsWith("custom:") ? migration?.available ? migration.mappings[binding.avatarId] : void 0 : binding.cloudId;
      return [binding.avatarId, cloudId].includes(selectedHostId);
    }) : [];
    if (matches.length > 1) throw new Error("Host binding maps to more than one GenPet");
    const registry = await this.registry();
    const id = matches[0]?.id ?? registry.activePetId ?? pets.find((pet) => !pet.archived && !pet.error)?.id;
    if (id) await this.selectPet(id, now);
    return {
      petId: id ?? null,
      matched: !!matches.length,
      selectionRead: selectedHostId !== void 0,
      selectedHostId: selectedHostId ?? null,
      ...pets.some((pet) => pet.error) ? { errors: pets.filter((pet) => pet.error).map((pet) => ({ petId: pet.id, file: pet.file, error: pet.error })) } : {}
    };
  }
  validate(state, before) {
    if (state.version !== 3 || state.host !== this.host || state.needsImport)
      throw new Error("Only an adopted v3 record may be written");
    const pet = state.pet;
    if (!pet) return;
    identifier(pet.id, "petId");
    validateStage("egg", pet.state.stage);
    if (typeof pet.memory.text !== "string" || !Number.isFinite(pet.memory.updatedAt))
      throw new Error("Invalid memory record");
    if (state.pending && state.pending.petId !== pet.id) throw new Error("Pending story belongs to another Pet");
    if (state.stories.some((story) => story.petId !== pet.id) || state.art.some((art) => art.petId !== pet.id))
      throw new Error("Pet records must not mix identities");
    const old = before?.pet;
    if (old?.id !== pet.id) return;
    if (old.binding) {
      const binding = pet.binding;
      if (!binding) throw new Error("An existing Pet retains its host binding");
      const cloudId = old.binding.cloudId ?? (old.binding.avatarId.startsWith("pet_") ? old.binding.avatarId : void 0);
      const stableLocalAlias = old.binding.avatarId.startsWith("custom:") && binding.avatarId === old.binding.avatarId && binding.destination === old.binding.destination;
      if (cloudId && !stableLocalAlias && (binding.cloudId !== void 0 && binding.cloudId !== cloudId || binding.cloudId === void 0 && binding.avatarId !== cloudId))
        throw new Error("An existing Pet retains its cloud binding");
      if (old.binding.cloudId && !stableLocalAlias && binding.cloudId !== old.binding.cloudId)
        throw new Error("An existing Pet retains its cloud binding");
      if (stableLocalAlias && old.binding.cloudId && !binding.cloudId)
        throw new Error("An existing Pet retains its mapped cloud binding");
      if (binding.avatarId !== old.binding.avatarId && !(old.binding.avatarId.startsWith("custom:") && cloudId && binding.avatarId === cloudId && binding.cloudId === cloudId))
        throw new Error("An existing Pet retains its Avatar binding");
      if (binding.host !== old.binding.host || old.binding.destination !== void 0 && binding.destination !== old.binding.destination)
        throw new Error("An existing Pet retains its host binding");
    }
    for (const field of ["genes", "personality", "acquisition", "designReason"]) {
      const value = old.soul[field];
      if (value !== null && value !== void 0 && !jsonEqual(value, pet.soul[field]))
        throw new Error(`An existing Pet retains its soul.${field}`);
    }
    validateStage(old.state.stage, pet.state.stage);
    if (!jsonEqual(old.memory, pet.memory) && !state.stories.some(
      (story) => story.id === pet.memory.storyId && !before.stories.some((previous) => previous.id === story.id)
    ))
      throw new Error("Memory is written only by a completed story");
  }
  async validateBindingUniqueness(state, registry) {
    const pet = state.pet;
    if (!pet?.binding) return;
    const aliases = [
      text(pet.binding.avatarId, "Avatar ID"),
      ...pet.binding.cloudId ? [text(pet.binding.cloudId, "cloud ID")] : []
    ];
    const ids = /* @__PURE__ */ new Set([...registry.pets.map((peer) => peer.id), ...await this.canonicalIds()]);
    for (const id of ids) {
      if (id === pet.id || registry.pets.find((peer) => peer.id === id)?.archived) continue;
      const saved = await readJson(path12.join(this.petDirectory(id), "state.json"));
      const binding = saved?.pet?.binding;
      if (binding && [binding.avatarId, binding.cloudId].some((alias) => alias && aliases.includes(alias)))
        throw new Error(`Host binding is already assigned to Pet ${id}`);
    }
  }
  async persist(state, registry, before, now = Date.now()) {
    this.validate(state, before);
    const id = state.pet?.id;
    if (!id) {
      await atomicJson(path12.join(this.root, "current.json"), state);
      return;
    }
    ensureGrowthClock(state);
    const entry = registry.pets.find((pet) => pet.id === id);
    if (!entry) this.activate(registry, id, now);
    else if (before?.pet && before.pet.id !== id) this.activate(registry, id, now);
    if (state.replacesPetId && state.replacesPetId !== id) {
      const replaced = registry.pets.find((pet) => pet.id === state.replacesPetId);
      if (replaced) replaced.archived ??= { at: now, replacesPetId: id };
    }
    if (!before?.pet || !jsonEqual(before.pet.binding, state.pet?.binding))
      await this.validateBindingUniqueness(state, registry);
    const record2 = structuredClone(state);
    delete record2.needsImport;
    delete record2.legacyFile;
    for (const owner of [...record2.stories, ...record2.pending ? [record2.pending] : []]) {
      if (owner.steps === void 0) continue;
      const steps = owner.steps;
      const previous = before?.pending?.id === owner.id ? before.pending : before?.stories.find((story) => story.id === owner.id);
      const committed = previous?.steps ?? [];
      if (steps.length < committed.length || committed.some((step, index) => !jsonEqual(step, steps[index])))
        throw new Error("Committed generation units are append-only");
      if (previous?.stepsCount === steps.length && jsonEqual(committed, steps)) {
        owner.stepsCount = steps.length;
        delete owner.steps;
        continue;
      }
      const file = path12.join(this.petDirectory(id), "stories", `${key(owner.id)}.json`);
      const existing = await readJson(file);
      const uncommittedAttempts = existing?.uncommittedAttempts ?? [];
      if (existing?.steps?.length > committed.length && !jsonEqual(existing.steps, steps))
        uncommittedAttempts.push({ at: now, steps: existing.steps.slice(committed.length) });
      await atomicJson(file, {
        version: 1,
        petId: id,
        storyId: owner.id,
        steps,
        ...uncommittedAttempts.length ? { uncommittedAttempts } : {}
      });
      owner.stepsCount = steps.length;
      delete owner.steps;
    }
    await atomicJson(path12.join(this.petDirectory(id), "state.json"), record2);
    await atomicJson(this.registryFile, registry);
    this.selectedId = id;
    if (this.pinnedId !== void 0) this.pinnedId = id;
  }
  /** One host lock serializes Pet writes and selection, while failed callbacks publish nothing. */
  async transaction(fn) {
    return this.locked(async () => {
      const state = await this.peek();
      if (state.needsImport) throw new Error("The legacy Pet needs explicit import before it can be changed");
      const before = structuredClone(state), registry = await this.registry();
      if (state.pet && registry.pets.find((pet) => pet.id === state.pet.id)?.archived)
        throw new Error("An archived Pet is read-only until explicitly restored");
      const result = await fn(state);
      if (before.handoff?.status === "exported") {
        const frozen = [
          "pet",
          "stories",
          "art",
          "pending",
          "chats",
          "growthClock",
          "schedule",
          "handoff",
          "legacy",
          "replacesPetId"
        ];
        if (frozen.some((field) => !jsonEqual(before[field], state[field])))
          throw new Error("The exported Pet record is read-only until its main environment is transferred back");
      }
      await this.persist(state, registry, before);
      return result;
    });
  }
  /** Confirmed new adoption can keep all historical files separate without first importing them. */
  async createPet(options, now = Date.now()) {
    if (!options.confirmed) throw new Error("New adoption requires explicit user confirmation");
    return this.locked(async () => {
      const before = await this.peek(), registry = await this.registry();
      if (options.replace && before.handoff?.status === "exported")
        throw new Error("Transfer the Pet back to this environment before replacing its bound resource");
      if (before.pending?.mode === "story")
        throw new Error("Finish or cancel the existing story before adopting another Pet");
      const state = { ...fresh(this.host), pet: createPet(options.name, now) };
      if (options.replace && before.pet) {
        const backup = path12.join(this.root, "backups", `replaced-${before.pet.id}-${now}.json`);
        await atomicJson(backup, before);
        if (before.pet.binding) state.pet.binding = structuredClone(before.pet.binding);
        state.replacesPetId = before.pet.id;
        if (before.schedule) state.schedule = structuredClone(before.schedule);
      }
      await this.persist(state, registry, void 0, now);
      return this.readPet(state.pet.id, registry);
    });
  }
  async importRecord(file, options, now = Date.now()) {
    if (!options.confirmed) throw new Error("Import requires explicit user confirmation");
    if (!path12.isAbsolute(file)) throw new Error("Legacy file must be absolute");
    return this.locked(async () => {
      const source = await readJson(file);
      if (!source?.pet?.id) throw new Error("No Pet to import");
      const id = identifier(source.pet.id, "petId"), registry = await this.registry();
      const existing = await this.readPet(id, registry, true);
      if (existing.pet) {
        this.activate(registry, id, now);
        await atomicJson(this.registryFile, registry);
        this.selectedId = id;
        if (this.pinnedId !== void 0) this.pinnedId = id;
        return this.readPet(id, registry);
      }
      const state = await prepareImport(this, file, options, now);
      await this.persist(state, registry, void 0, now);
      return this.readPet(id, registry);
    });
  }
  /** Publish a checked handoff under one lock, replacing the old host's activity facts with the incoming clock. */
  async installTransfer(input, now = Date.now()) {
    const state = structuredClone(input);
    this.validate(state);
    if (!state.pet || state.handoff?.status !== "imported" || state.handoff.target !== this.host)
      throw new Error("Install a validated transfer for this main environment");
    const id = identifier(state.pet.id, "transferred petId");
    return this.locked(async () => {
      const registry = await this.registry();
      const existing = await this.readPet(id, registry, true, true);
      if (existing.pet) {
        if (existing.handoff?.status === "imported" && existing.handoff.id === state.handoff.id) {
          if (existing.handoff.activityTransferId !== void 0 && registry.pets.find((pet) => pet.id === id)?.transferId !== existing.handoff.activityTransferId) {
            const clock2 = ensureGrowthClock(existing);
            const recovered = {
              id,
              pausedMs: clock2.pausedMs,
              transferId: existing.handoff.activityTransferId,
              ...clock2.pausedAt !== void 0 ? { pausedAt: clock2.pausedAt } : {},
              ...clock2.lastActivatedAt !== void 0 ? { lastActivatedAt: clock2.lastActivatedAt } : {},
              ...clock2.lastInactiveAt !== void 0 ? { lastInactiveAt: clock2.lastInactiveAt } : {}
            };
            const index = registry.pets.findIndex((pet) => pet.id === id);
            if (index < 0) registry.pets.push(recovered);
            else registry.pets[index] = recovered;
          }
          this.activate(registry, id, now);
          await atomicJson(this.registryFile, registry);
          this.selectedId = id;
          if (this.pinnedId !== void 0) this.pinnedId = id;
          return this.readPet(id, registry);
        }
        if (existing.handoff?.status !== "exported") throw new Error("The destination Pet is already writable");
        if (state.handoff.previousTransferId !== existing.handoff.id)
          throw new Error("This transfer does not follow the destination ownership receipt");
      }
      const clock = ensureGrowthClock(state);
      if (!Number.isFinite(clock.pausedMs) || clock.pausedMs < 0 || clock.pausedAt !== void 0 && !Number.isFinite(clock.pausedAt))
        throw new Error("Invalid transferred activation clock");
      const entry = {
        id,
        pausedMs: clock.pausedMs,
        transferId: state.handoff.id,
        ...clock.pausedAt !== void 0 ? { pausedAt: clock.pausedAt } : {},
        ...clock.lastActivatedAt !== void 0 ? { lastActivatedAt: clock.lastActivatedAt } : {},
        ...clock.lastInactiveAt !== void 0 ? { lastInactiveAt: clock.lastInactiveAt } : {}
      };
      const previousIndex = registry.pets.findIndex((pet) => pet.id === id);
      if (previousIndex < 0) registry.pets.push(entry);
      else registry.pets[previousIndex] = entry;
      this.activate(registry, id, now);
      clock.pausedMs = entry.pausedMs;
      delete clock.pausedAt;
      if (entry.lastActivatedAt !== void 0) clock.lastActivatedAt = entry.lastActivatedAt;
      if (entry.lastInactiveAt !== void 0) clock.lastInactiveAt = entry.lastInactiveAt;
      if (state.replacesPetId && state.replacesPetId !== id) {
        const replaced = registry.pets.find((pet) => pet.id === state.replacesPetId);
        if (replaced) replaced.archived ??= { at: now, replacesPetId: id };
      }
      await this.validateBindingUniqueness(state, registry);
      state.handoff.activityTransferId = state.handoff.id;
      await this.persist(state, registry, void 0, now);
      return this.readPet(id, registry);
    });
  }
  /** The Agent supplies a source-backed upgrade summary or missing voice once, without a growth experience. */
  async supplementLegacy(options, now = Date.now()) {
    if (!options.confirmed) throw new Error("Legacy supplementation requires explicit user confirmation");
    return this.locked(async () => {
      const state = await this.peek(), registry = await this.registry();
      if (!state.pet || !state.legacy || state.needsImport)
        throw new Error("Import the legacy Pet before filling its missing records");
      if (state.handoff?.status === "exported")
        throw new Error("The exported Pet record is read-only until its main environment is transferred back");
      if (state.pending) throw new Error("Finish the pending story before supplementing its records");
      let changed = false;
      for (const field of ["personality", "designReason"]) {
        if (options[field] === void 0) continue;
        const value = text(options[field], field), current = state.pet.soul[field];
        if (current !== void 0 && current !== value) throw new Error(`An existing Pet retains its soul.${field}`);
        if (current === void 0) {
          state.pet.soul[field] = value;
          changed = true;
        }
      }
      if (options.voice !== void 0) {
        if (state.legacy.sourceVersion === 3)
          throw new Error("Speaking habits are supplemented only for imported legacy Pets");
        const voice = text(options.voice, "voice");
        const previous = state.legacy.voiceSupplement;
        if (previous && previous.text !== voice) throw new Error("Legacy speaking habits are supplemented only once");
        if (!previous) {
          if (!state.pet.soul.personality)
            throw new Error("Fill the legacy personality before adding its missing speaking habits");
          state.pet.soul.personality += `

Speaking habits:
${voice}`;
          state.legacy.voiceSupplement = { text: voice, at: now };
          changed = true;
        }
      }
      if (options.memory !== void 0) {
        const value = text(options.memory, "memory");
        if (state.pet.memory.text && state.pet.memory.text !== value)
          throw new Error("Legacy memory is supplemented only once");
        if (!state.pet.memory.text) {
          if (state.legacy.memorySupplementedAt !== void 0)
            throw new Error("Legacy memory was already supplemented");
          state.pet.memory = { text: value, updatedAt: now, storyId: "legacy" };
          state.legacy.memorySupplementedAt = now;
          changed = true;
        }
      }
      if (changed) {
        state.pet.revision++;
        await this.persist(state, registry, void 0, now);
      }
      return state;
    });
  }
};

// src/debugger.ts
async function launchDebugger(port = Number(process.env.GENPET_PORT || (packageHost() === "cloud" ? 47832 : 47831))) {
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("Invalid debugger port");
  const url = `http://127.0.0.1:${port}`, root = new Store(void 0, packageHost()).root;
  async function inspect() {
    let response;
    try {
      response = await fetch(url + "/api/health", { signal: AbortSignal.timeout(500) });
    } catch {
      return false;
    }
    const value = await response.json().catch(() => null);
    if (value?.service !== "genpet-debugger" || value.root !== root)
      throw new Error("Debugger port belongs to another service or data directory");
    return true;
  }
  if (await inspect()) return { url, reused: true };
  const child = spawn(process.execPath, [path13.join(import.meta.dirname, "debugger-server.js")], {
    windowsHide: true,
    detached: true,
    stdio: "ignore",
    env: { ...process.env, GENPET_PORT: String(port), GENPET_DATA_DIR: path13.resolve(dataRoot()) }
  });
  let failure;
  child.once("error", (error) => {
    failure = error;
  });
  child.unref();
  for (let i = 0; i < 50; i++) {
    if (failure) throw failure;
    await new Promise((resolve) => setTimeout(resolve, 100));
    if (await inspect()) return { url, reused: false };
    if (child.exitCode !== null) throw new Error("Debugger failed to start");
  }
  throw new Error("Debugger startup timed out");
}

// src/generation.ts
import { createHash as createHash7 } from "node:crypto";
var object2 = (value) => !!value && typeof value === "object" && !Array.isArray(value);
function definition(unit) {
  const units = readUnits();
  if (!Object.hasOwn(units, unit)) throw new Error(`Unknown generation unit: ${unit}`);
  return units[unit];
}
function references(value) {
  if (!Array.isArray(value)) throw new Error("inputRefs must be an array");
  return value.map((ref) => text(ref, "input reference"));
}
function validateUnitResult(unit, input) {
  const contract = definition(unit);
  if (!object2(input) || !object2(input.result)) throw new Error("A unit result requires an object envelope and result");
  const inputRefs = references(input.inputRefs), result = input.result;
  for (const [field, type] of Object.entries(contract.result)) {
    const value = result[field];
    const valid = type === "string" ? typeof value === "string" && !!value.trim() : type === "array" ? Array.isArray(value) : type === "object" ? object2(value) : type === "nullable-string" ? value === null || typeof value === "string" && !!value.trim() : type === "nullable-object" ? value === null || object2(value) : false;
    if (!Object.hasOwn(result, field) || !valid) throw new Error(`${unit}.${field} requires ${type}`);
  }
  for (const [field, choices] of Object.entries(contract.choices ?? {}))
    if (!choices.includes(result[field])) throw new Error(`Invalid ${unit}.${field}`);
  return { inputRefs, result };
}
function unitRequest(unit, fixture) {
  const contract = definition(unit);
  if (!object2(fixture) || !object2(fixture.inputs)) throw new Error("A unit fixture requires inputs");
  for (const field of contract.inputs)
    if (!Object.hasOwn(fixture.inputs, field)) throw new Error(`Missing ${unit} input: ${field}`);
  const inputRefs = references(fixture.inputRefs ?? []);
  const prompt = [
    `\u8FD9\u662F\u72EC\u7ACB\u5355\u5143\u6D4B\u8BD5\uFF0C\u53EA\u6267\u884C ${unit}\u3002\u4E0B\u6E38\u6D41\u7A0B\u53EA\u4F5C\u80CC\u666F\uFF0C\u4E0D\u6267\u884C\u5176\u4ED6\u5355\u5143\u3002\u53EA\u4F7F\u7528\u4E0B\u9762\u63D0\u4F9B\u7684\u8F93\u5165\u4E0E\u771F\u5B9E\u6587\u4EF6\uFF1B\u4E0D\u5F97\u8865\u67E5\u771F\u5B9E\u7528\u6237\u8D44\u6599\u3001\u64CD\u4F5C Pet/Avatar\u3001\u521B\u5EFA\u8C03\u5EA6\u6216\u6267\u884C\u5B8C\u6574\u751F\u547D\u5468\u671F\u3002\u9700\u8981\u56FE\u50CF\u68C0\u67E5\u65F6\u5B9E\u9645\u67E5\u770B\u8F93\u5165\u6587\u4EF6\u3002`,
    readPrompt("meta"),
    readPrompt(unit),
    `\u8FD4\u56DE\u4E00\u4E2A JSON \u5BF9\u8C61\uFF1AinputRefs \u4E3A\u8F93\u5165\u5F15\u7528\u5217\u8868\uFF0Cresult \u4E3A\u672C\u5355\u5143\u7ED3\u679C\u3002\u6240\u9700\u5B57\u6BB5\u4E0E\u7C7B\u578B\uFF1A${JSON.stringify(contract.result)}\u3002${contract.choices ? `\u5DE5\u7A0B\u53D6\u503C\uFF1A${JSON.stringify(contract.choices)}\u3002` : ""}\u53EF\u589E\u52A0\u5B57\u6BB5\uFF0C\u5185\u5BB9\u4FDD\u6301\u5F00\u653E\u3002\u4E0D\u8981\u8F93\u51FA\u989D\u5916\u7684\u6D41\u7A0B\u8BF4\u660E\u3002`,
    `\u56FA\u5B9A\u8F93\u5165\uFF1A${JSON.stringify({ inputRefs, inputs: fixture.inputs }, null, 2)}`
  ].join("\n\n");
  return { unit, inputRefs, prompt, promptHash: createHash7("sha256").update(prompt).digest("hex") };
}
function canonical(value) {
  return JSON.stringify(
    value,
    (_, item) => object2(item) ? Object.fromEntries(
      Object.keys(item).sort().map((key2) => [key2, item[key2]])
    ) : item
  );
}
async function recordStep(store2, operationId, unit, input) {
  const output = validateUnitResult(unit, input);
  return store2.transaction((state) => {
    const owner = state.pending?.id === operationId ? pendingFor(state, operationId) : state.stories.find((story) => story.id === operationId && story.petId === state.pet?.id);
    if (!owner) throw new Error("Generation step belongs to another or missing story");
    const id = `step-${createHash7("sha256").update(canonical([operationId, unit, output])).digest("hex").slice(0, 24)}`;
    const steps = owner.steps ??= [], previous = steps.find((step2) => step2.id === id);
    if (previous) return previous;
    const step = { id, unit, at: Date.now(), ...output };
    steps.push(step);
    return step;
  });
}

// src/lifecycle.ts
import { randomUUID as randomUUID9 } from "node:crypto";
import { access as access2 } from "node:fs/promises";
import path14 from "node:path";

// src/naming.ts
function namingDue(state) {
  return !state.pending && !!state.pet && state.pet.state.stage !== "egg" && state.pet.naming?.status === "unasked";
}
function target(state, petId2, allowPending = false) {
  identifier(petId2, "petId");
  if (!state.pet || state.pet.id !== petId2) throw new Error("Naming reply belongs to another or missing pet");
  if (state.pending && !allowPending) throw new Error("Finish the unfinished story before naming this pet");
  return state.pet;
}
async function markNameAsked(store2, petId2) {
  return store2.transaction((state) => {
    const pet = target(state, petId2, true);
    if (pet.state.stage === "egg" || pet.naming?.status !== "unasked")
      return { petId: petId2, asked: false, status: pet.naming?.status ?? "named" };
    pet.naming = { status: "asked", askedAt: Date.now() };
    return { petId: petId2, asked: true, status: pet.naming.status };
  });
}
async function namePet(store2, petId2, userName) {
  const name2 = text(userName, "user supplied name");
  if (name2.length > 100 || /[\u0000-\u001f\u007f]/.test(name2))
    throw new Error("Name must be one line of at most 100 characters");
  return store2.transaction((state) => {
    const pet = target(state, petId2);
    if (pet.name === name2 && pet.naming?.status === "named") return pet;
    pet.name = name2;
    pet.naming = {
      status: "named",
      namedAt: Date.now(),
      ...pet.naming?.askedAt ? { askedAt: pet.naming.askedAt } : {}
    };
    pet.revision++;
    return pet;
  });
}

// src/schedule.ts
var CHECK_INTERVAL = 5 * 36e5;
function dueStory(state, now = Date.now(), timezone = state.schedule?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone) {
  const period = state.pet ? Math.floor((now - state.pet.adoptedAt) / CHECK_INTERVAL) : 0;
  const growing = growth(state, now);
  const special = growing?.special;
  const deadlineAt = growing?.advanceBy ?? (special ? "endBy" in special ? special.endBy : special.enterBy : null);
  const deadline = deadlineAt === null ? null : Date.parse(deadlineAt);
  const growthTrigger = growing?.required && state.pet ? `growth:${state.pet.id}:${growing.stage}:${growing.required}:${deadline}` : null;
  const triggerId = growthTrigger ?? (period >= 1 ? `period:${period}` : null);
  const stopped = isStopped(state) || state.handoff?.status === "exported" || state.needsImport === true || state.growthClock?.pausedAt !== void 0;
  const completed = !!triggerId && state.stories.some((story) => story.triggerId === triggerId);
  const periodCovered = !growthTrigger && !!state.pet && state.stories.some(
    (story) => story.petId === state.pet.id && story.triggerId.startsWith("growth:") && Math.floor((story.at - state.pet.adoptedAt) / CHECK_INTERVAL) === period
  );
  const due = !stopped && !!triggerId && !completed && !periodCovered;
  const nextPeriod = state.pet ? state.pet.adoptedAt + (Math.max(0, period) + 1) * CHECK_INTERVAL : null;
  const nextCheck = stopped || nextPeriod === null ? null : due ? now : Math.min(nextPeriod, deadline !== null && deadline > now ? deadline : Infinity);
  return {
    timezone,
    intervalHours: CHECK_INTERVAL / 36e5,
    triggerId,
    stopped,
    due,
    pending: state.pending?.id ?? null,
    growthRequired: growing?.required ?? null,
    growthDeadlineAt: deadlineAt,
    nextCheckAt: nextCheck === null ? null : iso2(nextCheck)
  };
}
var isStopped = (state) => state.schedule?.stoppedAt !== void 0 && state.schedule.resumedAt === void 0;
var iso2 = (time) => new Date(time).toISOString();
function timeSense(state, now = Date.now()) {
  const last = state.stories.at(-1)?.at ?? state.pet?.adoptedAt;
  if (last === void 0) return null;
  const schedule = state.schedule;
  const pause = schedule?.stoppedAt !== void 0 && schedule.stoppedAt >= last;
  return {
    lastStoryAt: iso2(last),
    hoursSinceLastStory: Math.round((now - last) / 36e5 * 10) / 10,
    checkIntervalHours: CHECK_INTERVAL / 36e5,
    ...state.pending ? {
      pendingStartedAt: iso2(state.pending.startedAt),
      pendingHours: Math.round((now - state.pending.startedAt) / 36e5 * 10) / 10
    } : {},
    ...pause ? { userStoppedCheckAt: iso2(schedule.stoppedAt) } : {},
    ...pause && schedule.resumedAt !== void 0 ? { checkResumedAt: iso2(schedule.resumedAt) } : {}
  };
}
async function setSchedule(store2, timezone, reference) {
  const zone = text(timezone, "timezone");
  new Intl.DateTimeFormat("en", { timeZone: zone });
  const ref = text(reference, "schedule reference");
  return store2.transaction((state) => {
    const previous = state.schedule;
    const resumedAt = previous?.stoppedAt !== void 0 ? previous.resumedAt ?? Date.now() : void 0;
    return state.schedule = {
      timezone: zone,
      reference: ref,
      ...previous?.stoppedAt !== void 0 ? { stoppedAt: previous.stoppedAt, resumedAt } : {}
    };
  });
}
async function stopSchedule(store2) {
  return store2.transaction((state) => {
    const previous = state.schedule;
    if (isStopped(state))
      return { stopped: true, stoppedAt: previous.stoppedAt, previousReference: previous?.reference ?? null };
    state.schedule = {
      ...previous,
      timezone: previous?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
      stoppedAt: Date.now()
    };
    delete state.schedule.resumedAt;
    return { stopped: true, stoppedAt: state.schedule.stoppedAt, previousReference: previous?.reference ?? null };
  });
}

// src/variety.ts
import { createHash as createHash8, randomBytes } from "node:crypto";
var SOURCE_WEIGHTS = { natural: 70, object: 20, imagined: 10 };
function seededValue(seed, purpose) {
  return createHash8("sha256").update(`${seed}\0${purpose}`).digest().readUInt32BE(0) / 4294967296;
}
function sourceFromSeed(seed) {
  const value = seededValue(seed, "source") * 100;
  return value < SOURCE_WEIGHTS.natural ? "natural" : value < SOURCE_WEIGHTS.natural + SOURCE_WEIGHTS.object ? "object" : "imagined";
}
function storyOutputs(story, previous, state) {
  const result = [];
  const appearanceChanged = typeof story.appearanceChanged === "boolean" ? story.appearanceChanged : previous ? story.appearanceId !== previous.appearanceId : state?.pet?.soul.acquisition?.storyId === story.id;
  if (story.appearanceId && appearanceChanged) result.push("appearance");
  if (story.mediaIds.some((id) => !state || state.art.some((art) => art.id === id && art.kind !== "artifact"))) {
    if (story.home !== void 0 && story.home !== previous?.home) result.push("home");
    else result.push("item");
  }
  return result;
}
function recentContent(state, count = 10) {
  const items = state.stories.slice(-Math.max(1, count)).map((story, index, stories) => ({
    id: story.id,
    at: story.at,
    outputs: storyOutputs(story, index ? stories[index - 1] : state.stories[state.stories.indexOf(story) - 1], state),
    stage: story.stage,
    special: story.special,
    text: story.text,
    reason: story.reason
  }));
  let textOnlyStreak = 0;
  for (const item of [...items].reverse()) {
    if (item.outputs.length) break;
    textOnlyStreak++;
  }
  return { items, textOnlyStreak, visualRequired: textOnlyStreak >= 2, memory: state.pet?.memory ?? null };
}
async function chooseSource(store2, operationId, seed) {
  return store2.transaction((state) => {
    const pending = pendingFor(state, operationId);
    if (pending.sourceChoice) {
      if (seed && seed !== pending.sourceChoice.seed) throw new Error("The source seed is already saved");
      return pending.sourceChoice;
    }
    const value = seed ? text(seed, "seed") : randomBytes(16).toString("hex");
    return pending.sourceChoice = { seed: value, sourceType: sourceFromSeed(value) };
  });
}
async function chooseCandidate(store2, operationId, input, seed) {
  if (!["story", "genes"].includes(input.purpose)) throw new Error("Choice purpose must be story or genes");
  if (!Array.isArray(input.candidates) || input.candidates.length < 2)
    throw new Error("Provide at least two grounded candidates");
  const candidates = input.candidates.map((candidate) => ({
    id: identifier(candidate.id, "candidateId"),
    description: text(candidate.description, "candidate description"),
    contextRefs: candidate.contextRefs.map((ref) => text(ref, "context reference")),
    ...candidate.outputs ? { outputs: candidate.outputs } : {}
  }));
  if (new Set(candidates.map((candidate) => candidate.id)).size !== candidates.length)
    throw new Error("Candidate IDs must be unique");
  if (candidates.some((candidate) => candidate.outputs?.some((output) => !["appearance", "home", "item"].includes(output))))
    throw new Error("Unknown visual output");
  const hash2 = createHash8("sha256").update(JSON.stringify(candidates)).digest("hex");
  return store2.transaction((state) => {
    const pending = pendingFor(state, operationId);
    if (pending.selection) {
      if (pending.selection.candidateHash !== hash2 || pending.selection.purpose !== input.purpose || seed && seed !== pending.selection.seed)
        throw new Error("The selected candidates and seed are already saved; resume them");
      return { ...pending.selection, candidates: pending.candidates };
    }
    const value = seed ?? pending.sourceChoice?.seed ?? randomBytes(16).toString("hex");
    const recent = recentContent(state);
    if (input.purpose === "story" && !candidates.some((candidate) => candidate.outputs?.length))
      throw new Error("Include a candidate with a visible output");
    const weights = candidates.map((candidate) => {
      if (input.purpose !== "story") return 1;
      const textOnly = !candidate.outputs?.length;
      if (textOnly && (recent.visualRequired || !candidate.contextRefs.length)) return 0;
      const last = recent.items.findLastIndex(
        (item) => textOnly ? !item.outputs.length : item.outputs.some((output) => candidate.outputs.includes(output))
      );
      return recent.items.length - last;
    });
    let pick = seededValue(value, input.purpose) * weights.reduce((sum, weight) => sum + weight, 0);
    let index = weights.length - 1;
    for (let i = 0; i < weights.length; i++) {
      pick -= weights[i];
      if (pick < 0) {
        index = i;
        break;
      }
    }
    pending.candidates = candidates;
    pending.selection = {
      seed: value,
      purpose: input.purpose,
      candidateId: candidates[index].id,
      candidateHash: hash2,
      ...pending.sourceChoice ? { sourceType: pending.sourceChoice.sourceType } : {}
    };
    return { ...pending.selection, candidates, weights };
  });
}

// src/lifecycle.ts
function startPending(pet, triggerId, mode) {
  return {
    id: `story-${randomUUID9()}`,
    triggerId,
    petId: pet.id,
    baseRevision: pet.revision,
    startedAt: Date.now(),
    mode
  };
}
async function beginStory(store2, triggerId, options = {}) {
  identifier(triggerId, "triggerId");
  return store2.transaction(async (state) => {
    if (state.handoff?.status === "exported")
      throw new Error("This environment handed the Pet to another host; import it back before writing stories");
    const completed = state.stories.find((story) => story.triggerId === triggerId);
    if (completed) return { status: "completed", story: completed };
    if (state.pending) {
      if (state.pending.triggerId !== triggerId)
        throw new Error(`Unfinished story ${state.pending.id}; resume it first`);
      return {
        status: "pending",
        pending: state.pending,
        pet: state.pet,
        growth: growth(state),
        time: timeSense(state)
      };
    }
    if (!state.pet && await findLegacyRecord(store2))
      throw new Error("Existing legacy pet found; migrate it before creating a new identity");
    state.pet ??= createPet();
    state.pending = startPending(state.pet, triggerId, state.pet.soul.genes ? "story" : "initialization");
    if (options.forceGrowth) state.pending.forceGrowth = true;
    return { status: "pending", pending: state.pending, pet: state.pet, growth: growth(state), time: timeSense(state) };
  });
}
function validatePlan(state, input) {
  const pet = state.pet;
  const plan = {
    text: text(input.text, "story text"),
    reason: text(input.reason, "decision reason"),
    state: text(input.state, "state"),
    stage: validateStage(pet.state.stage, input.stage ?? pet.state.stage)
  };
  if (input.contextRefs !== void 0) {
    if (!Array.isArray(input.contextRefs)) throw new Error("contextRefs must be an array");
    plan.contextRefs = input.contextRefs.map((ref) => text(ref, "context reference"));
  }
  if (input.memory !== void 0) plan.memory = text(input.memory, "memory");
  if (input.designReason !== void 0) plan.designReason = text(input.designReason, "design reason");
  if (plan.stage !== pet.state.stage && plan.stage !== stages[stages.indexOf(pet.state.stage) + 1])
    throw new Error("A story advances at most one stage");
  if (plan.stage !== pet.state.stage && !state.pending?.forceGrowth && !growth(state)?.canAdvance)
    throw new Error("Growth needs five experiences or its latest-time deadline; use explicit grow for a forced change");
  if (input.home !== void 0) {
    plan.home = text(input.home, "home");
    if (plan.stage === "egg") throw new Error("The home begins after hatching");
  }
  const specialActive = !!pet.state.special && pet.state.special.endedAt === void 0;
  if (input.special === null) {
    if (!specialActive) throw new Error("There is no special form to end");
    plan.special = null;
  } else if (input.special !== void 0) {
    plan.special = text(input.special, "special form");
    if (pet.state.stage !== "adult") throw new Error("Special forms begin in adulthood");
  }
  if (input.personality !== void 0) {
    plan.personality = text(input.personality, "personality");
    if (pet.soul.personality && pet.soul.personality !== plan.personality)
      throw new Error("An existing pet retains its personality");
  } else if (pet.soul.personality) plan.personality = pet.soul.personality;
  if (!pet.soul.genes) {
    if (!state.pending?.journey?.completed || !state.pending.journey.rounds.length)
      throw new Error("Complete the adoption choice journey before planning its genes and egg");
    if (plan.stage !== "egg") throw new Error("Initialization begins with an egg");
    plan.genes = text(input.genes, "open gene description");
    plan.place = text(input.place, "acquisition place");
    plan.connection = text(input.connection, "user connection");
    if (!plan.personality) throw new Error("Initialization requires an individual personality");
    if (!input.appearance) throw new Error("Initialization requires an egg appearance");
  } else if (input.genes !== void 0 && input.genes !== pet.soul.genes)
    throw new Error("An existing pet retains its genes");
  if (input.appearance)
    plan.appearance = {
      description: text(input.appearance.description, "appearance description"),
      ...input.appearance.reuseArtId ? { reuseArtId: identifier(input.appearance.reuseArtId, "reuseArtId") } : {}
    };
  if (plan.stage !== pet.state.stage && !plan.appearance)
    throw new Error("Evolution requires an appearance for the new stage");
  if ((plan.special === null || plan.special !== void 0 && !specialActive) && !plan.appearance)
    throw new Error("Entering or leaving a special form requires an appearance");
  const required = growth(state)?.required;
  if (required === "advance" && plan.stage === pet.state.stage)
    throw new Error(`Growth is due: this story advances to ${stages[stages.indexOf(pet.state.stage) + 1]}`);
  if (required === "enter-special" && typeof plan.special !== "string")
    throw new Error("A special form is due: this story enters one");
  if (required === "end-special" && plan.special !== null)
    throw new Error("The special form is due to end in this story");
  if (plan.appearance?.reuseArtId) appearanceFor(state, plan.stage, plan.appearance.reuseArtId);
  if (input.mediaIds !== void 0) {
    if (!Array.isArray(input.mediaIds)) throw new Error("mediaIds must be an array");
    plan.mediaIds = input.mediaIds.map((id) => identifier(id, "mediaId"));
    for (const id of plan.mediaIds)
      if (!state.art.some((art) => art.id === id && art.petId === pet.id))
        throw new Error("Media belongs to another pet or is missing");
  }
  return plan;
}
async function planStory(store2, id, input) {
  return store2.transaction((state) => {
    const pending = pendingFor(state, id);
    if (pending.plan && JSON.stringify(input) === JSON.stringify(pending.plan)) return pending;
    const plan = validatePlan(state, input);
    if (pending.plan && JSON.stringify(pending.plan) !== JSON.stringify(plan))
      throw new Error("The story plan is saved; resume it or cancel explicitly before redesigning");
    pending.plan = plan;
    return pending;
  });
}
function hostUpdateComplete(result, appearanceId) {
  if (!result?.updated || result.appearanceId !== appearanceId || result.error) return false;
  return result.storedArtworkVerified === true;
}
async function finishStory(store2, id) {
  return store2.transaction(async (state) => {
    const previous = state.stories.find((story2) => story2.id === id);
    if (previous) return previous;
    const pending = pendingFor(state, id);
    const plan = pending.plan;
    if (!plan) throw new Error("Save a story plan before completing it");
    const pet = state.pet;
    const previousStage = pet.state.stage;
    const appearance = desiredAppearance(state);
    if (plan.appearance) {
      if (!appearance) throw new Error("Appearance artwork is unfinished");
      await access2(appearance.file);
      if (!hostUpdateComplete(pending.hostResult, appearance.id))
        throw new Error("Host update or active Avatar refresh is unfinished; resume it");
      const target2 = await hostFor(state.host).findAvatar(state);
      if (!target2.avatarId || target2.avatarId !== pending.hostResult.avatarId)
        throw new Error("The host target changed or is unresolved; update the actual Pet before completing");
    }
    const current = requestId(state);
    const storyMedia = state.art.filter(
      (art) => art.requestId === current && (art.kind === "story" || art.kind === "artifact")
    );
    const mediaIds = [.../* @__PURE__ */ new Set([...plan.mediaIds ?? [], ...storyMedia.map((art) => art.id)])];
    for (const mediaId of mediaIds)
      await access2(state.art.find((art) => art.id === mediaId && art.petId === pet.id).file);
    const appearanceChanged = !!plan.appearance && appearance?.id !== pet.state.appearanceId;
    const hasVisibleMedia = mediaIds.some(
      (mediaId) => state.art.some((art) => art.id === mediaId && art.kind !== "artifact")
    );
    const item = pending.steps?.findLast((step) => step.unit === "story-item");
    const home = pending.steps?.findLast((step) => step.unit === "home");
    if ((item?.result.item || home?.result.visual) && !hasVisibleMedia)
      throw new Error("The final story item or home requests an image; accept its actual media before completing");
    if (pending.mode === "story" && !appearanceChanged && !hasVisibleMedia) {
      if (!plan.contextRefs?.length) throw new Error("A text-only story needs a user-related context reference");
      const sources = /* @__PURE__ */ new Set();
      for (const owner of [...state.stories, pending])
        for (const step of owner.steps ?? []) {
          if (step.unit !== "context") continue;
          const facts = Array.isArray(step.result.facts) ? step.result.facts : [];
          if (facts.length) for (const ref of step.inputRefs) sources.add(ref);
          for (const fact of facts) {
            if (fact && typeof fact === "object" && typeof fact.id === "string")
              sources.add(fact.id);
          }
        }
      for (const round of pet.soul.acquisition?.journey?.rounds ?? [])
        for (const ref of round.inputRefs) sources.add(ref);
      for (const chat of state.chats ?? []) sources.add(chat.id);
      for (const story2 of state.stories) if (story2.contextRefs?.some((ref) => sources.has(ref))) sources.add(story2.id);
      if (plan.contextRefs.some((ref) => !sources.has(ref)))
        throw new Error("The context reference is not present in the saved inputs or shared history");
      if (recentContent(state).visualRequired)
        throw new Error("At most two text-only stories in a row; produce a visible result");
    }
    const story = {
      id,
      triggerId: pending.triggerId,
      petId: pet.id,
      at: Date.now(),
      text: plan.text,
      reason: plan.reason,
      ...plan.designReason ? { designReason: plan.designReason } : {},
      ...plan.memory !== void 0 ? { memory: plan.memory } : {},
      ...pending.journey ? { journey: pending.journey } : {},
      ...pending.selection || pending.sourceChoice ? {
        random: {
          sourceChoice: pending.sourceChoice,
          selection: pending.selection,
          candidates: pending.candidates
        }
      } : {},
      ...plan.contextRefs?.length ? { contextRefs: plan.contextRefs } : {},
      stage: plan.stage,
      state: plan.state,
      ...plan.home !== void 0 ? { home: plan.home } : {},
      ...plan.special !== void 0 ? { special: plan.special } : {},
      ...appearance ? { appearanceId: appearance.id } : {},
      appearanceChanged,
      mediaIds,
      ...pending.steps?.length ? { steps: pending.steps } : {},
      ...pending.hostResult ? { hostResult: pending.hostResult } : {}
    };
    if (!pet.soul.genes) {
      pet.soul.genes = plan.genes;
      pet.soul.acquisition = {
        place: plan.place,
        connection: plan.connection,
        storyId: id,
        ...pending.journey ? { journey: pending.journey } : {}
      };
      if (plan.designReason) pet.soul.designReason = plan.designReason;
    }
    if (plan.personality) pet.soul.personality ??= plan.personality;
    pet.state.stage = plan.stage;
    if (plan.home !== void 0) pet.state.home = plan.home;
    if (plan.special === null) pet.state.special.endedAt = story.at;
    else if (plan.special !== void 0)
      pet.state.special = pet.state.special && pet.state.special.endedAt === void 0 ? { ...pet.state.special, description: plan.special } : { description: plan.special, since: story.at, storyId: id };
    pet.revision++;
    pet.state = {
      ...pet.state,
      stage: plan.stage,
      description: plan.state,
      storyId: id,
      updatedAt: story.at,
      ...appearance ? { appearanceId: appearance.id } : {}
    };
    if (pending.mode === "initialization") {
      pet.adoptedAt = story.at;
      const clock = ensureGrowthClock(state);
      clock.stageSince = story.at;
      clock.stagePausedMs = pausedTime(state, story.at);
    }
    stageAdvance(state, story.at);
    if (plan.memory !== void 0)
      commitExperience(
        state,
        id,
        plan.memory,
        story.at,
        pending.mode !== "initialization" && previousStage === story.stage
      );
    state.stories.push(story);
    state.pending = null;
    return story;
  });
}
async function cancelStory(store2, id) {
  return store2.transaction((state) => {
    const pending = pendingFor(state, id);
    if (pending.mode === "initialization" && pending.plan)
      throw new Error("Initialization genes are saved; resume it or explicitly reset the pet");
    state.pending = null;
    return { cancelled: pending.id };
  });
}
async function resetPet(store2, operationId) {
  const triggerId = `reset:${identifier(operationId, "reset operationId")}`;
  return store2.transaction(async (state) => {
    const completed = state.stories.find((story) => story.triggerId === triggerId);
    if (completed) return { status: "completed", story: completed };
    if (state.pending?.triggerId === triggerId) return { status: "pending", pending: state.pending, pet: state.pet };
    if (state.pending && state.pending.mode !== "initialization")
      throw new Error("Resume or cancel the unfinished story before an explicit reset");
    if (!state.pet && await findLegacyRecord(store2))
      throw new Error("Migrate the existing legacy pet before resetting its identity");
    const backup = path14.join(store2.root, "backups", `reset-${Date.now()}-${randomUUID9()}.json`);
    await atomicJson(backup, state);
    const previous = state.pet;
    const schedule = state.schedule;
    for (const key2 of Object.keys(state)) delete state[key2];
    Object.assign(state, fresh(store2.host), { pet: createPet(), ...schedule ? { schedule } : {} });
    const pet = state.pet;
    if (previous?.binding) pet.binding = previous.binding;
    if (previous) state.replacesPetId = previous.id;
    state.pending = startPending(pet, triggerId, "initialization");
    return { status: "pending", pending: state.pending, pet, backup };
  });
}
function storyOutput(state, storyId) {
  const story = storyId ? state.stories.find((story2) => story2.id === storyId) : state.stories.at(-1);
  if (!story) throw new Error("No completed story");
  const appearance = state.art.find((art) => art.id === story.appearanceId);
  return {
    text: story.text,
    media: state.art.filter((art) => story.mediaIds.includes(art.id)),
    appearance,
    portrait: state.art.findLast(
      (art) => art.petId === story.petId && art.kind === "portrait" && art.requestId === appearance?.requestId
    ) ?? null,
    naming: { due: namingDue(state), petId: state.pet?.id, status: state.pet?.naming?.status ?? "named" },
    prompt: readPrompt("output")
  };
}

// src/journey.ts
async function journeyStep(store2, operationId, input) {
  const scene = text(input.scene, "scene");
  const userInput = input.userInput === void 0 ? void 0 : text(input.userInput, "the user's actual choice");
  if (!Array.isArray(input.options) || !Array.isArray(input.inputRefs))
    throw new Error("options and inputRefs must be arrays");
  const offered = {
    scene,
    options: input.options.map((option) => text(option, "option")),
    inputRefs: input.inputRefs.map((ref) => text(ref, "input reference"))
  };
  return store2.transaction((state) => {
    const pending = pendingFor(state, operationId);
    if (pending.mode !== "initialization" || pending.plan)
      throw new Error("Choices belong to an unplanned adoption journey");
    const journey = pending.journey ??= { background: input.background?.trim() || scene, rounds: [] };
    if (userInput === void 0) {
      if (journey.completed || journey.rounds.length >= 5) throw new Error("The journey is complete");
      if (journey.awaiting && JSON.stringify(journey.awaiting) !== JSON.stringify(offered))
        throw new Error("Resume the offered scene before replacing it");
      journey.awaiting ??= offered;
      return journey;
    }
    if (journey.awaiting && (journey.awaiting.scene !== scene || JSON.stringify(journey.awaiting.options) !== JSON.stringify(offered.options)))
      throw new Error("The answer belongs to a different scene");
    const round = { ...offered, userInput };
    const last = journey.rounds.at(-1);
    if (last && JSON.stringify(last) === JSON.stringify(round)) {
      if (input.complete) {
        journey.completed = true;
        delete journey.awaiting;
      }
      return journey;
    }
    if (journey.completed || journey.rounds.length >= 5)
      throw new Error("The journey is complete; continue with its gene design");
    journey.rounds.push(round);
    delete journey.awaiting;
    if (input.complete || journey.rounds.length === 5) journey.completed = true;
    return journey;
  });
}

// src/handoff.ts
import { access as access3, cp, mkdir as mkdir6, readFile as readFile12 } from "node:fs/promises";
import path15 from "node:path";
import { randomUUID as randomUUID10 } from "node:crypto";
async function exportPet(store2, target2, destination) {
  if (target2 === store2.host || !["desktop", "cloud"].includes(target2))
    throw new Error("Choose the other main environment");
  if (!path15.isAbsolute(destination)) throw new Error("Transfer destination must be an absolute directory");
  const before = await store2.peek();
  if (!before.pet) throw new Error("No Pet to transfer");
  if (before.pending) throw new Error("Finish the current story before handing off");
  const owner = store2.forPet(before.pet.id);
  const directory = path15.join(destination, before.pet.id);
  const source = path15.join(store2.root, "pets", before.pet.id);
  if (path15.resolve(directory).startsWith(path15.resolve(source) + path15.sep) || path15.resolve(directory) === path15.resolve(source))
    throw new Error("Transfer destination must be outside the source Pet directory");
  const transferId = before.handoff?.status === "exported" && before.handoff.target === target2 ? before.handoff.id : `handoff-${randomUUID10()}`;
  const previousSchedule = before.schedule;
  if (before.handoff?.status === "exported" && before.handoff.target !== target2)
    throw new Error("This Pet already has an outstanding transfer to another environment");
  if (before.handoff?.status !== "exported")
    await owner.transaction((state) => {
      if (state.pending) throw new Error("Finish the current story before handing off");
      state.handoff = {
        id: transferId,
        target: target2,
        status: "exported",
        at: Date.now(),
        ...state.handoff?.id ? { previousTransferId: state.handoff.id } : {}
      };
      state.schedule = { ...state.schedule, timezone: state.schedule?.timezone ?? "UTC", stoppedAt: Date.now() };
      delete state.schedule.resumedAt;
    });
  await mkdir6(destination, { recursive: true });
  await cp(source, directory, { recursive: true, force: false, errorOnExist: false });
  const exported = await owner.peek();
  await atomicJson(path15.join(directory, "transfer.json"), {
    version: 1,
    transferId,
    petId: before.pet.id,
    source: store2.host,
    target: target2,
    previousTransferId: exported.handoff?.previousTransferId,
    state: exported
  });
  return {
    transferId,
    petId: before.pet.id,
    directory,
    previousSchedule,
    steps: [
      "Pause the previous host task by its saved reference.",
      "Transfer this entire directory to the target.",
      "Import it, then create the target host task."
    ],
    sourceStopped: true
  };
}
async function importPet(store2, directory) {
  if (!path15.isAbsolute(directory)) throw new Error("Transfer source must be an absolute directory");
  const manifest = JSON.parse(await readFile12(path15.join(directory, "transfer.json"), "utf8"));
  identifier(manifest.petId, "petId");
  identifier(manifest.transferId, "transferId");
  if (manifest.version !== 1 || !["desktop", "cloud"].includes(manifest.source) || manifest.target !== store2.host || manifest.source === store2.host || manifest.state.host !== manifest.source || manifest.state.pet?.id !== manifest.petId || manifest.state.handoff?.id !== manifest.transferId || manifest.state.handoff?.target !== manifest.target || manifest.state.handoff?.previousTransferId !== manifest.previousTransferId || manifest.state.handoff?.status !== "exported")
    throw new Error("Invalid or mismatched Pet transfer");
  const existing = await store2.forPet(manifest.petId).peek().catch(async (error) => {
    if (error.code === "GENPET_RECORD_MISSING" && !error.registered) return fresh(store2.host);
    if (error.code === "GENPET_TRANSFER_INCOMPLETE") {
      const incoming = structuredClone(manifest.state);
      incoming.host = store2.host;
      incoming.handoff.status = "imported";
      if (incoming.pet.binding) incoming.pet.binding.host = store2.host;
      return store2.installTransfer(incoming);
    }
    throw error;
  });
  if (existing.handoff?.id === manifest.transferId && existing.handoff.status === "imported")
    return { petId: manifest.petId, transferId: manifest.transferId, imported: true, duplicate: true };
  if (existing.pet && existing.handoff?.status !== "exported")
    throw new Error("The destination Pet is already writable; finish its handoff first");
  if (existing.pet && existing.handoff?.id !== manifest.previousTransferId)
    throw new Error("Stale transfer; its predecessor does not match the latest handoff");
  const target2 = path15.join(store2.root, "pets", manifest.petId);
  await mkdir6(target2, { recursive: true });
  const sourceStateFile = path15.resolve(directory, "state.json");
  await cp(directory, target2, {
    recursive: true,
    force: true,
    filter: (source) => path15.resolve(source) !== sourceStateFile
  });
  const state = manifest.state;
  state.host = store2.host;
  state.handoff = {
    id: manifest.transferId,
    target: store2.host,
    status: "imported",
    at: Date.now(),
    ...manifest.previousTransferId ? { previousTransferId: manifest.previousTransferId } : {}
  };
  if (state.pet.binding) state.pet.binding.host = store2.host;
  for (const art of state.art) {
    const local = path15.join(target2, "assets", path15.basename(art.file));
    await access3(local);
    art.file = local;
  }
  await store2.installTransfer(state);
  return {
    petId: manifest.petId,
    transferId: manifest.transferId,
    imported: true,
    directory: target2,
    schedule: "Create the new host task and save its reference before resuming."
  };
}

// src/pipeline.ts
import { execFile } from "node:child_process";
import { existsSync as existsSync3 } from "node:fs";
import { mkdir as mkdir7, writeFile as writeFile5 } from "node:fs/promises";
import { randomUUID as randomUUID11 } from "node:crypto";
import path16 from "node:path";
import { promisify } from "node:util";
var execute = promisify(execFile);
var HELPER_TIMEOUT_MS = 55e3;
var helperDirectory = () => path16.join(pluginRoot(), "vendor", "hatch-pet", "scripts");
async function pipelineRuntime(python) {
  const candidates = [
    ...new Set(
      [python, process.env.GENPET_PYTHON, "python", "python3"].filter((value) => Boolean(value))
    )
  ];
  for (const executable of candidates) {
    try {
      const { stdout } = await execute(
        executable,
        [
          "-c",
          'import json,sys,PIL;print(json.dumps({"python":sys.executable,"pythonVersion":sys.version.split()[0],"pillowVersion":PIL.__version__}))'
        ],
        { timeout: 5e3, windowsHide: true, env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1", PYTHONUTF8: "1" } }
      );
      return { available: true, ...JSON.parse(stdout), helpers: helperDirectory() };
    } catch {
    }
  }
  return {
    available: false,
    reason: "A Python runtime with Pillow is unavailable. Ask the host workspace dependencies tool for its Python path and pass it as python or GENPET_PYTHON."
  };
}
function helperFailure(error) {
  return {
    stdout: error.stdout ?? "",
    stderr: error.stderr || error.message,
    exitCode: error.code ?? 1,
    timedOut: Boolean(error.killed)
  };
}
async function callHelper(script, args2, runDir, python, preparing = false) {
  if (!path16.isAbsolute(runDir)) throw new Error("Pipeline runDir must be an absolute local path");
  const runtime = await pipelineRuntime(python);
  if (!runtime.available) return { ok: false, runtime, run_dir: runDir };
  const helper = path16.join(runtime.helpers, script);
  if (!existsSync3(helper))
    return { ok: false, runtime, run_dir: runDir, error: "Installed deterministic image helper is missing" };
  let stdout = "", stderr = "", exitCode = 0, timedOut = false;
  try {
    const output = await execute(runtime.python, [helper, ...args2], {
      timeout: HELPER_TIMEOUT_MS,
      maxBuffer: 16 * 1024 * 1024,
      windowsHide: true,
      env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1", PYTHONUTF8: "1" }
    });
    stdout = output.stdout;
    stderr = output.stderr;
  } catch (error) {
    ({ stdout, stderr, exitCode, timedOut } = helperFailure(error));
  }
  const reportFile = preparing && !existsSync3(path16.join(runDir, "imagegen-jobs.json")) ? `${runDir}.prepare-${randomUUID11()}.json` : path16.join(runDir, "qa", "wrapper-runs", `${script.replace(".py", "")}-${Date.now()}-${randomUUID11()}.json`);
  await mkdir7(path16.dirname(reportFile), { recursive: true });
  await writeFile5(reportFile, JSON.stringify({ runtime, helper, args: args2, stdout, stderr, exitCode, timedOut }, null, 2), {
    flag: "wx"
  });
  try {
    return { ...JSON.parse(stdout), runtime, reportFile };
  } catch {
    return {
      ok: false,
      runtime,
      reportFile,
      run_dir: runDir,
      ...timedOut ? {
        timedOut: true,
        error: `Image helper stopped after ${HELPER_TIMEOUT_MS / 1e3} s; run the same command again to resume from its cached steps`
      } : { error: stderr.trim() || "Image helper did not return a structured result" }
    };
  }
}
async function pipelinePrepare(input) {
  if (!input.notes?.trim() || !input.petName?.trim())
    throw new Error("Pipeline needs the actual Pet name and appearance notes");
  if (Object.hasOwn(input, "requestId") && (typeof input.requestId !== "string" || !input.requestId.trim()))
    throw new Error("pipeline-prepare requestId must be a non-empty string from art-request.id");
  const args2 = [
    input.stage === "egg" ? "--egg" : "--parallel",
    "--stage",
    input.stage,
    "--output-dir",
    input.runDir,
    "--pet-id",
    input.requestId ? `genpet-${input.requestId}` : "genpet",
    "--pet-name",
    input.petName,
    "--pet-notes",
    input.notes,
    "--style-preset",
    "pixel"
  ];
  if (input.requestId) args2.push("--request-id", input.requestId);
  if (input.noMirrorLook) args2.push("--no-mirror-look", input.noMirrorLook);
  for (const reference of input.references ?? []) {
    if (!path16.isAbsolute(reference)) throw new Error("Pipeline references must be absolute local paths");
    args2.push("--reference", reference);
  }
  return callHelper("prepare_pet_run.py", args2, input.runDir, input.python, true);
}
async function pipelineProcess(runDir, options = {}) {
  if (options.review && options.failure) throw new Error("Record one review or failed attempt at a time");
  const args2 = ["--run-dir", runDir, "--previews"];
  if (options.review)
    args2.push(
      "--record-review",
      options.review.jobId,
      "--verdict",
      options.review.verdict,
      "--note",
      options.review.note
    );
  if (options.failure) {
    args2.push(
      "--record-failure",
      options.failure.jobId,
      "--error",
      options.failure.error,
      "--note",
      options.failure.note
    );
    if (options.failure.attemptId) args2.push("--attempt-id", options.failure.attemptId);
    if (options.failure.frameIndices) args2.push("--frame-indices", options.failure.frameIndices.join(","));
  }
  return callHelper("process_pet_run.py", args2, runDir, options.python);
}

// src/cli.ts
async function jsonFile(file) {
  if (!path17.isAbsolute(file ?? "")) throw new Error("JSON input requires an absolute file");
  return JSON.parse(await readFile13(file, "utf8"));
}
var shared = {
  help: {
    usage: "help | --help",
    run: async () => ({ commands: Object.values(commands).map((command) => command.usage) })
  },
  status: {
    usage: "status [--full]",
    run: async ([flag], store2) => {
      const state = await store2.peek();
      const legacyFile = state.pet ? null : await findLegacyRecord(store2);
      return {
        ...flag === "--full" ? state : statusView(state),
        namingDue: namingDue(state),
        growth: growth(state),
        time: timeSense(state),
        dataDirectory: store2.root,
        ...legacyFile ? { legacyFile } : {}
      };
    }
  },
  // Story lifecycle
  "begin-story": {
    usage: "begin-story [TRIGGER_ID] [--grow]",
    run: ([trigger, flag], store2) => beginStory(store2, trigger || `manual:${randomUUID12()}`, { forceGrowth: flag === "--grow" })
  },
  "journey-step": {
    usage: "journey-step OPERATION_ID STEP_JSON",
    run: async ([id, file], store2) => journeyStep(store2, id, await jsonFile(file))
  },
  "random-source": {
    usage: "random-source OPERATION_ID [SEED]",
    run: ([id, seed], store2) => chooseSource(store2, id, seed)
  },
  "random-choice": {
    usage: "random-choice OPERATION_ID CANDIDATES_JSON [SEED]",
    run: async ([id, file, seed], store2) => chooseCandidate(store2, id, await jsonFile(file), seed)
  },
  "recent-content": {
    usage: "recent-content [COUNT]",
    run: async ([count], store2) => recentContent(await store2.peek(), count ? Number(count) : 10)
  },
  "plan-story": {
    usage: "plan-story OPERATION_ID PLAN_JSON",
    run: async ([id, file], store2) => planStory(store2, id, await jsonFile(file))
  },
  "finish-story": { usage: "finish-story OPERATION_ID", run: ([id], store2) => finishStory(store2, id) },
  "cancel-story": { usage: "cancel-story OPERATION_ID", run: ([id], store2) => cancelStory(store2, id) },
  "story-output": { usage: "story-output [STORY_ID]", run: async ([id], store2) => storyOutput(await store2.peek(), id) },
  reset: { usage: "reset [OPERATION_ID]", run: ([id], store2) => resetPet(store2, id || randomUUID12()) },
  // Artwork and host updates
  "art-request": { usage: "art-request", run: async (_, store2) => artRequest(await store2.peek()) },
  "find-avatar": { usage: "find-avatar", run: async (_, store2) => hostFor(store2.host).findAvatar(await store2.peek()) },
  "bind-cloud": { usage: "bind-cloud CLOUD_PET_ID", run: ([id], store2) => bindCloud(store2, id) },
  "set-appearance": { usage: "set-appearance", run: (_, store2) => hostFor(store2.host).setAppearance(store2) },
  diagnose: { usage: "diagnose", run: (_, store2) => hostFor(store2.host).diagnose(store2) },
  "companion-brief": {
    usage: "companion-brief [BRIEF_DRAFT_JSON]",
    run: async ([file], store2) => {
      const state = await store2.peek();
      if (!state.pet) throw new Error("No Pet");
      const target2 = await hostFor(store2.host).findAvatar(state);
      const brief = cloudBriefForPet(state.pet, file ? await jsonFile(file) : void 0);
      return {
        ...brief,
        cloudId: target2.cloudId,
        agentSteps: brief.needsSummary ? [
          {
            command: "companion-brief ABSOLUTE_DRAFT_JSON",
            check: "Summarize sourceBrief into at most 500 characters, preserving the actual name, soul and speaking habits, shared memory and current stage/state. Save {petId, revision, description}; review the summary against the source, then rerun this command. Do not truncate fields or invent facts."
          }
        ] : target2.cloudId ? [
          {
            tool: "update_pet",
            arguments: { pet_id: target2.cloudId, updates: { description: brief.description } }
          },
          {
            tool: "list_pets",
            check: "Read the exact Pet ID back and compare its description with this generated brief before claiming synchronization."
          }
        ] : []
      };
    }
  },
  "pipeline-runtime": { usage: "pipeline-runtime [PYTHON_PATH]", run: ([python]) => pipelineRuntime(python) },
  "pipeline-prepare": {
    usage: "pipeline-prepare INPUT_JSON",
    run: async ([file]) => pipelinePrepare(await jsonFile(file))
  },
  "pipeline-process": {
    usage: "pipeline-process RUN_DIRECTORY [OPTIONS_JSON]",
    run: async ([run, file]) => pipelineProcess(run, file ? await jsonFile(file) : {})
  },
  "accept-art": {
    usage: "accept-art REQUEST_ID FILE portrait|atlas|story|artifact SOURCE [DESCRIPTION]",
    run: (args2, store2) => {
      if (args2.length < 4 || args2.length > 5)
        throw new Error(
          "Usage: accept-art REQUEST_ID FILE portrait|atlas|story|artifact SOURCE [DESCRIPTION]; REQUEST_ID is art-request.id"
        );
      const [requestId2, file, kind, source, description] = args2;
      return acceptArt(store2, { requestId: requestId2, file, kind, source, description });
    }
  },
  "host-result": {
    usage: "host-result OPERATION_ID RESULT_JSON",
    run: async ([id, file], store2) => recordHostResult(store2, id, await jsonFile(file))
  },
  // Naming
  "name-pet": { usage: "name-pet PET_ID USER_NAME", run: ([id, name2], store2) => namePet(store2, id, name2) },
  "name-asked": { usage: "name-asked PET_ID", run: ([id], store2) => markNameAsked(store2, id) },
  // Conversation
  "note-chat": { usage: "note-chat PET_ID NOTE", run: ([id, note], store2) => noteChat(store2, id, note) },
  // Generation units
  prompt: { usage: "prompt MODULE", run: ([name2]) => ({ prompt: readPrompt(name2) }) },
  "unit-request": {
    usage: "unit-request UNIT INPUT_JSON",
    run: async ([unit, file]) => unitRequest(unit, await jsonFile(file))
  },
  "verify-unit": {
    usage: "verify-unit UNIT RESULT_JSON",
    run: async ([unit, file]) => ({ unit, contractValid: true, ...validateUnitResult(unit, await jsonFile(file)) })
  },
  "record-step": {
    usage: "record-step OPERATION_ID UNIT RESULT_JSON",
    run: async ([id, unit, file], store2) => recordStep(store2, id, unit, await jsonFile(file))
  },
  // Scheduling
  due: { usage: "due [TIMEZONE]", run: async ([zone], store2) => dueStory(await store2.peek(), Date.now(), zone) },
  schedule: {
    usage: "schedule TIMEZONE REFERENCE",
    run: ([zone, reference], store2) => setSchedule(store2, zone, reference)
  },
  "schedule-stop": { usage: "schedule-stop", run: (_, store2) => stopSchedule(store2) },
  // Maintenance
  "migrate-legacy": {
    usage: "migrate-legacy V1_FILE DESIGN_JSON",
    run: async ([file, design], store2) => migrateLegacy(store2, file, await jsonFile(design))
  },
  "import-record": {
    usage: "import-record OLD_STATE_JSON DESIGN_JSON",
    run: async ([file, design], store2) => store2.importRecord(file, { ...await jsonFile(design), confirmed: true })
  },
  "supplement-legacy": {
    usage: "supplement-legacy DESIGN_JSON",
    run: async ([file], store2) => store2.supplementLegacy({ ...await jsonFile(file), confirmed: true })
  },
  "new-pet": {
    usage: "new-pet [--replace]",
    run: ([flag], store2) => store2.createPet({ confirmed: true, replace: flag === "--replace" })
  },
  "list-pets": { usage: "list-pets", run: (_, store2) => store2.listPets() },
  "inspect-records": {
    usage: "inspect-records",
    run: async (_, store2) => ({
      dataDirectory: store2.base,
      records: {
        desktop: await new Store(store2.base, "desktop").listPets(),
        cloud: await new Store(store2.base, "cloud").listPets()
      },
      legacy: await inspectLegacyRecords(store2.base)
    })
  },
  "activate-pet": { usage: "activate-pet PET_ID", run: ([id], store2) => store2.selectPet(id) },
  "resolve-active": { usage: "resolve-active [HOST_AVATAR_ID]", run: ([id], store2) => store2.resolveActive(id ?? null) },
  "handoff-export": {
    usage: "handoff-export desktop|cloud DESTINATION_DIR",
    run: ([host2, dir], store2) => exportPet(store2, host2, dir)
  },
  "handoff-import": { usage: "handoff-import TRANSFER_DIR", run: ([dir], store2) => importPet(store2, dir) },
  debugger: { usage: "debugger", run: () => launchDebugger() }
};
var argv = process.argv.slice(2);
var hostIndex = argv.indexOf("--host");
var host = hostIndex >= 0 ? argv.splice(hostIndex, 2)[1] : packageHost();
if (host !== "desktop" && host !== "cloud") throw new Error("Host must be desktop or cloud");
var petIndex = argv.indexOf("--pet");
var petId = petIndex >= 0 ? argv.splice(petIndex, 2)[1] : void 0;
var store = new Store(void 0, host, petId);
var commands = { ...shared, ...hostFor(store.host).commands };
var [rawName, ...args] = argv;
var name = rawName === "--help" ? "help" : rawName;
try {
  const command = commands[name];
  if (!command)
    throw new Error(
      `Commands:
${Object.values(commands).map((command2) => `  ${command2.usage}`).join("\n")}`
    );
  if (args[0] === "--help" && !command.usage.includes("--help")) {
    console.log(JSON.stringify({ usage: command.usage }, null, 2));
  } else {
    if ([
      "plan-story",
      "finish-story",
      "cancel-story",
      "host-result",
      "record-step",
      "journey-step",
      "random-source",
      "random-choice",
      "story-output"
    ].includes(name) && args[0])
      store = await store.forOperation(args[0]);
    else if (!petId && ["begin-story", "due", "name-pet", "name-asked", "note-chat", "reset", "new-pet"].includes(name)) {
      const selected = await hostFor(store.host).selectedAvatar?.();
      await store.resolveActive(selected?.available ? selected.id : void 0);
    }
    console.log(JSON.stringify(await command.run(args, store), null, 2));
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
