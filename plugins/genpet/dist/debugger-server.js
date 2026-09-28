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
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
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
      let name = "";
      for (let i = 4; i < 8; i++) {
        name += String.fromCharCode(data[i]);
      }
      let ancillary = Boolean(data[4] & 32);
      if (!this._hasIHDR && type !== constants.TYPE_IHDR) {
        this.error(new Error("Expected IHDR on beggining"));
        return;
      }
      this._crc = new CrcCalculator();
      this._crc.write(Buffer.from(name));
      if (this._chunks[type]) {
        return this._chunks[type](length);
      }
      if (!ancillary) {
        this.error(new Error("Unsupported critical chunk type " + name));
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
    var parse2 = require_parser_sync();
    var pack = require_packer_sync();
    exports.read = function(buffer, options) {
      return parse2(buffer, options || {});
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

// src/debugger-server.ts
import http from "node:http";

// src/native-ipc.ts
import net from "node:net";
import { lstat } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { homedir } from "node:os";
function desktopIpcPath() {
  return process.platform === "win32" ? "\\\\.\\pipe\\codex-ipc" : path.join(process.env.CODEX_HOME || path.join(homedir(), ".codex"), "ipc", "ipc.sock");
}
async function refreshViaIpc(socketPath = desktopIpcPath(), timeoutMs = 2e3) {
  if (process.platform === "win32") {
    if (!socketPath.startsWith("\\\\.\\pipe\\")) throw Error("Expected a local Windows named pipe");
  } else {
    const [file, directory] = await Promise.all([lstat(socketPath), lstat(path.dirname(socketPath))]);
    const uid = process.getuid?.();
    if (uid == null || file.uid !== uid || directory.uid !== uid || !file.isSocket() || !directory.isDirectory() || directory.mode & 18) {
      throw Error("IPC socket must belong to the current user in a protected directory");
    }
  }
  const sockets = /* @__PURE__ */ new Set();
  const pending = /* @__PURE__ */ new Set();
  let failure;
  const fail = (error) => {
    failure ??= error;
    for (const reject of [...pending]) reject(error);
  };
  const deadline = setTimeout(() => fail(Error("IPC refresh timed out")), timeoutMs);
  function connect() {
    return new Promise((resolve, reject) => {
      if (failure) return reject(failure);
      pending.add(reject);
      const socket = net.createConnection(socketPath);
      sockets.add(socket);
      const requestId = randomUUID();
      let buffer = Buffer.alloc(0);
      let listener;
      const send = (message) => {
        if (failure) throw failure;
        const body = Buffer.from(JSON.stringify(message));
        const header = Buffer.alloc(4);
        header.writeUInt32LE(body.length);
        socket.write(Buffer.concat([header, body]));
      };
      socket.on("error", fail);
      socket.on("close", () => fail(Error("IPC connection closed")));
      socket.on("connect", () => send({ type: "request", requestId, sourceClientId: "genpet", version: 0, method: "initialize", params: { clientType: "genpet" } }));
      socket.on("data", (chunk) => {
        buffer = Buffer.concat([buffer, chunk]);
        while (buffer.length >= 4) {
          const length = buffer.readUInt32LE(0);
          if (length > 16 * 1024 * 1024) {
            fail(Error("IPC frame too large"));
            return;
          }
          if (buffer.length < length + 4) return;
          let message;
          try {
            message = JSON.parse(buffer.subarray(4, length + 4).toString());
          } catch {
            fail(Error("Invalid IPC JSON"));
            return;
          }
          buffer = buffer.subarray(length + 4);
          if (!message || typeof message !== "object") {
            fail(Error("Invalid IPC message"));
            return;
          }
          if (message.type === "response" && message.requestId === requestId) {
            if (message.resultType !== "success" || typeof message.result?.clientId !== "string") {
              fail(Error("IPC initialization rejected"));
              return;
            }
            pending.delete(reject);
            resolve({ id: message.result.clientId, send, onMessage: (fn) => {
              listener = fn;
            } });
          }
          listener?.(message);
        }
      });
    });
  }
  try {
    const observer = await connect();
    const sender = await connect();
    await new Promise((resolve, reject) => {
      if (failure) return reject(failure);
      pending.add(reject);
      observer.onMessage((message) => {
        if (message.type === "broadcast" && message.method === "query-cache-invalidate" && message.version === 0 && message.sourceClientId === sender.id && JSON.stringify(message.params) === JSON.stringify({ queryKey: ["custom-avatars"], reset: false })) {
          pending.delete(reject);
          resolve();
        }
      });
      sender.send({ type: "broadcast", method: "query-cache-invalidate", version: 0, sourceClientId: sender.id, params: { queryKey: ["custom-avatars"], reset: false } });
    });
    return { socketPath, handshakeConfirmed: true, relayConfirmed: true, hostRefreshRequested: true };
  } finally {
    clearTimeout(deadline);
    for (const socket of sockets) {
      socket.removeAllListeners("close");
      socket.destroy();
    }
  }
}

// src/debugger-server.ts
import { copyFile as copyFile2, readFile as readFile8, realpath, rename as rename4, writeFile as writeFile4 } from "node:fs/promises";
import path9 from "node:path";
import { homedir as homedir7 } from "node:os";
import { randomBytes, randomUUID as randomUUID6 } from "node:crypto";
import { pathToFileURL } from "node:url";

// src/store.ts
import { mkdir, readFile as readFile2, rename, writeFile, rm, stat as stat2 } from "node:fs/promises";
import { homedir as homedir3 } from "node:os";
import path4 from "node:path";
import { randomUUID as randomUUID2 } from "node:crypto";

// src/core.ts
var HOUR = 36e5;
var DAY = 24 * HOUR;
var DEFAULT_PROFILE = Object.freeze({
  name: "GenPet",
  palette: "sage",
  interest: "build",
  temperament: "curious"
});
var DEFAULT_POLICY = Object.freeze({
  hatchHours: 5,
  growthHours: 24,
  contextHours: 5,
  juvenileDays: 7,
  adultDays: 21,
  maxEvents: 80,
  maxContextEntries: 200,
  contextRetentionDays: 7
});
function growthMaturity(days, adultDays) {
  return Math.sqrt(Math.min(1, Math.max(0, days / adultDays)));
}
var kinds = ["build", "research", "create", "learn", "rest"];
var temperaments = ["calm", "curious", "playful"];
var paletteHue = { sage: 145, peach: 24, sky: 204, lilac: 273 };
var situations = {
  build: { prop: "tool", scene: "workshop" },
  research: { prop: "book", scene: "library" },
  create: { prop: "brush", scene: "studio" },
  learn: { prop: "star", scene: "garden" },
  rest: { prop: "pillow", scene: "meadow" }
};
var expression = {
  build: "calm",
  research: "curious",
  create: "playful",
  learn: "curious",
  rest: "calm"
};
function timestamp(value, field2) {
  if (!Number.isFinite(value) || value < 0 || value > 864e13) throw new Error(`${field2} must be a valid nonnegative epoch timestamp`);
}
function validateProfile(profile) {
  if (typeof profile.name !== "string" || !profile.name.trim() || [...profile.name].length > 60) throw new Error("Name must contain 1\u201360 characters");
  if (!Object.hasOwn(paletteHue, profile.palette)) throw new Error("Invalid palette");
  if (!kinds.slice(0, 4).includes(profile.interest)) throw new Error("Invalid interest");
  if (!temperaments.includes(profile.temperament)) throw new Error("Invalid temperament");
}
function validatePolicy(policy) {
  for (const [key, value] of Object.entries(policy)) {
    if (!Number.isFinite(value) || value <= 0) throw new Error(`Invalid policy: ${key}`);
  }
  for (const key of ["juvenileDays", "adultDays", "maxEvents", "maxContextEntries"]) {
    if (!Number.isInteger(policy[key])) throw new Error(`Policy ${key} must be an integer`);
  }
  if (policy.adultDays <= policy.juvenileDays) throw new Error("Adult threshold must follow juvenile threshold");
  if (policy.maxEvents > 1e3 || policy.maxContextEntries > 1e4) throw new Error("History limits are too large");
}
function hash(value) {
  let result = 2166136261;
  for (const character of value) {
    result ^= character.codePointAt(0);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}
function resolveHatchIdentity(pet) {
  const resolvedAt = pet.adoptedAt + pet.policy.hatchHours * HOUR;
  const evidence = pet.context.filter((e) => e.occurredAt >= pet.adoptedAt && e.occurredAt < resolvedAt);
  const counts = kinds.map((kind) => evidence.filter((e) => e.kind === kind).length);
  const maximum = Math.max(...counts);
  const influence = maximum > 0 && counts.filter((count) => count === maximum).length === 1 ? kinds[counts.indexOf(maximum)] : null;
  const base = hash(`${pet.seed}:birth-shape`);
  const bias = influence ? (hash(`${pet.seed}:gentle-bias:${influence}`) % 2001 / 1e3 - 1) * 0.06 : 0;
  const appendageRoll = Math.max(0, Math.min(0.999999, hash(`${pet.seed}:birth-appendage`) / 2 ** 32 + bias));
  return {
    family: "roundling",
    bodyShape: ["round", "pear", "bean"][base % 3],
    appendage: ["buds", "leaflets", "soft-fins"][Math.floor(appendageRoll * 3)],
    roundness: Math.round((0.88 + (base >>> 8) % 101 / 2e3 + bias / 3) * 1e3) / 1e3,
    resolvedAt,
    evidenceCount: evidence.length,
    influence,
    identitySeed: hash(`${pet.seed}:egg-first-v1:${counts.join(",")}`),
    algorithmVersion: "egg-first-v1"
  };
}
function migratePet(original) {
  const pet = structuredClone(original);
  const oldDna = pet.dna;
  pet.dna = { hue: oldDna.hue, pattern: oldDna.pattern, patternSeed: oldDna.patternSeed };
  if (pet.stage === "egg") pet.hatchIdentity = null;
  else if (!pet.hatchIdentity) {
    pet.hatchIdentity = {
      ...resolveHatchIdentity(pet),
      algorithmVersion: "legacy-migration-v1",
      appendage: oldDna.earStyle === "pointed" ? "leaflets" : oldDna.earStyle === "floppy" ? "soft-fins" : "buds"
    };
  }
  return pet;
}
function baseline(temperament) {
  return {
    calm: temperament === "calm" ? 0.5 : 0.25,
    curious: temperament === "curious" ? 0.5 : 0.25,
    playful: temperament === "playful" ? 0.5 : 0.25
  };
}
function event(pet, type, at, message, key = "") {
  const id = `${type}-${at}-${key}`;
  if (!pet.events.some((item) => item.id === id)) pet.events.push({ id, type, at, message });
  pet.events = pet.events.slice(-pet.policy.maxEvents);
}
function refreshState(pet, now) {
  const duration = pet.policy.contextHours * HOUR;
  const windowIndex = Math.floor((now - pet.adoptedAt) / duration);
  const end = pet.adoptedAt + windowIndex * duration;
  const entries = pet.context.filter((entry) => entry.occurredAt >= end - duration && entry.occurredAt < end);
  const counts = /* @__PURE__ */ new Map();
  for (const entry of entries) counts.set(entry.kind, (counts.get(entry.kind) ?? 0) + 1);
  const winner = [...counts.keys()].sort((a, b) => {
    const count = counts.get(b) - counts.get(a);
    if (count) return count;
    const latest = (kind) => Math.max(...entries.filter((e) => e.kind === kind).map((e) => e.occurredAt));
    return latest(b) - latest(a) || kinds.indexOf(a) - kinds.indexOf(b);
  })[0] ?? null;
  pet.state = {
    windowIndex,
    kind: winner,
    ...winner ? situations[winner] : { prop: "none", scene: "nest" },
    reason: winner ? `${counts.get(winner)} ${winner} observation(s) in the last closed ${pet.policy.contextHours}-hour window.` : windowIndex === 0 ? "Settling into the nest; the first context window is still open." : "No observations in the last closed window; resting comfortably.",
    updatedAt: end
  };
}
function refreshExpression(pet) {
  const scores = baseline(pet.profile.temperament);
  const hatch = pet.adoptedAt + pet.policy.hatchHours * HOUR;
  const dayLength = pet.policy.growthHours * HOUR;
  for (let day = Math.max(0, pet.growth.days - 7); day < pet.growth.days; day++) {
    const start = hatch + day * dayLength;
    const entries = pet.context.filter((e) => e.occurredAt >= start && e.occurredAt < start + dayLength);
    if (!entries.length) continue;
    for (const entry of entries) scores[expression[entry.kind]] += 0.025 / entries.length;
  }
  const total = scores.calm + scores.curious + scores.playful;
  pet.growth.temperament = { calm: scores.calm / total, curious: scores.curious / total, playful: scores.playful / total };
}
function createPet(profile = { ...DEFAULT_PROFILE }, nowMs = Date.now(), seed, overrides = {}) {
  timestamp(nowMs, "nowMs");
  validateProfile(profile);
  const policy = { ...DEFAULT_POLICY, ...overrides };
  validatePolicy(policy);
  const identity = String(seed ?? globalThis.crypto.randomUUID());
  if (!identity || identity.length > 200) throw new Error("Seed must contain 1\u2013200 characters");
  const gene = hash(identity);
  const pet = {
    id: `genpet-${hash(`${identity}:${nowMs}`).toString(36)}`,
    seed: identity,
    adoptedAt: nowMs,
    lastEvaluatedAt: nowMs,
    profile: { ...profile, name: profile.name.trim() },
    dna: {
      hue: paletteHue[profile.palette] + gene % 17 - 8,
      pattern: ["speckles", "stripes", "patches"][gene % 3],
      patternSeed: gene
    },
    hatchIdentity: null,
    stage: "egg",
    ageDays: 0,
    growth: { days: 0, size: 0.68, temperament: baseline(profile.temperament), milestoneDays: [], decorationLevel: 0 },
    context: [],
    state: { windowIndex: 0, kind: null, prop: "none", scene: "nest", reason: "", updatedAt: nowMs },
    events: [],
    policy
  };
  refreshState(pet, nowMs);
  event(pet, "adopted", nowMs, `${pet.profile.name} was adopted as a unique egg.`);
  return pet;
}
function evolvePet(original, nowMs) {
  timestamp(nowMs, "nowMs");
  const pet = migratePet(original);
  const now = Math.max(nowMs, pet.lastEvaluatedAt, pet.adoptedAt);
  const hatch = pet.adoptedAt + pet.policy.hatchHours * HOUR;
  const days = now < hatch ? 0 : Math.floor((now - hatch) / (pet.policy.growthHours * HOUR));
  const stage = now < hatch ? "egg" : days >= pet.policy.adultDays ? "adult" : days >= pet.policy.juvenileDays ? "juvenile" : "hatchling";
  if (stage !== "egg" && !pet.hatchIdentity) pet.hatchIdentity = resolveHatchIdentity(pet);
  if (pet.stage === "egg" && stage !== "egg") event(pet, "hatched", hatch, `${pet.profile.name} hatched.`);
  for (let day = Math.max(pet.growth.days + 1, days - pet.policy.maxEvents + 1); day <= days; day++) {
    const at = hatch + day * pet.policy.growthHours * HOUR;
    event(pet, "growth", at, `Growth day ${day}: a little bigger.`, String(day));
    if (day === pet.policy.juvenileDays || day === pet.policy.adultDays) event(
      pet,
      "stage",
      at,
      day === pet.policy.adultDays ? "Reached the adult stage." : "Reached the juvenile stage."
    );
  }
  pet.ageDays = Math.floor((now - pet.adoptedAt) / DAY);
  pet.growth.days = days;
  pet.growth.size = stage === "egg" ? 0.68 : 0.74 + 0.51 * growthMaturity(days, pet.policy.adultDays);
  pet.stage = stage;
  pet.lastEvaluatedAt = now;
  pet.context = pet.context.filter((e) => e.occurredAt >= now - pet.policy.contextRetentionDays * DAY).slice(-pet.policy.maxContextEntries);
  refreshState(pet, now);
  refreshExpression(pet);
  return pet;
}
function insertContext(pet, input, nowMs) {
  timestamp(nowMs, "nowMs");
  if (!kinds.includes(input.kind)) throw new Error("Invalid context kind");
  if (!["user", "codex-summary", "codex-local"].includes(input.source)) throw new Error("Invalid context source");
  if (input.summary !== void 0 && typeof input.summary !== "string") throw new Error("Summary must be text");
  if ([...input.summary ?? ""].length > 240) throw new Error("Summary must not exceed 240 characters");
  if (input.milestone !== void 0 && typeof input.milestone !== "boolean") throw new Error("Milestone must be boolean");
  const occurredAt = input.occurredAt ?? nowMs;
  timestamp(occurredAt, "occurredAt");
  if (occurredAt > nowMs) throw new Error("Context cannot be in the future");
  if (occurredAt < pet.adoptedAt || occurredAt < Math.max(nowMs, pet.lastEvaluatedAt) - pet.policy.contextRetentionDays * DAY)
    throw new Error("Context is expired or predates adoption");
  const summary = (input.summary ?? "").trim();
  const id = `ctx-${hash(JSON.stringify([pet.id, input.source, input.kind, occurredAt, summary, !!input.milestone])).toString(36)}`;
  if (pet.context.some((entry) => entry.id === id)) return;
  pet.context.push({
    id,
    kind: input.kind,
    source: input.source,
    summary,
    occurredAt,
    submittedAt: nowMs,
    milestone: input.milestone ?? false
  });
  pet.context.sort((a, b) => a.occurredAt - b.occurredAt || a.id.localeCompare(b.id));
  event(pet, "context", nowMs, `Recorded a ${input.kind} activity tag.`, id);
  if (input.milestone) {
    const day = Math.floor((occurredAt - pet.adoptedAt) / DAY);
    if (!pet.growth.milestoneDays.includes(day)) {
      pet.growth.milestoneDays = [...pet.growth.milestoneDays, day].sort((a, b) => a - b).slice(-90);
      pet.growth.decorationLevel = Math.min(3, pet.growth.milestoneDays.length);
      event(pet, "milestone", nowMs, "A meaningful day added a small keepsake.", String(day));
    }
  }
}
function addContextBatch(original, inputs, nowMs) {
  timestamp(nowMs, "nowMs");
  const pet = migratePet(original);
  for (const input of inputs) insertContext(pet, input, nowMs);
  return evolvePet(pet, nowMs);
}
function addContext(original, input, nowMs) {
  return addContextBatch(original, [input], nowMs);
}
function removeContext(original, id, nowMs) {
  const pet = evolvePet(original, nowMs);
  const removed = pet.context.find((entry) => entry.id === id);
  if (!removed) return pet;
  pet.context = pet.context.filter((entry) => entry.id !== id);
  pet.events = pet.events.filter((entry) => !entry.id.endsWith(`-${id}`));
  if (removed.milestone) {
    const day = Math.floor((removed.occurredAt - pet.adoptedAt) / DAY);
    if (!pet.context.some((entry) => entry.milestone && Math.floor((entry.occurredAt - pet.adoptedAt) / DAY) === day)) {
      pet.growth.milestoneDays = pet.growth.milestoneDays.filter((value) => value !== day);
      pet.growth.decorationLevel = Math.min(3, pet.growth.milestoneDays.length);
      pet.events = pet.events.filter((entry) => !(entry.type === "milestone" && entry.id.endsWith(`-${day}`)));
    }
  }
  refreshState(pet, pet.lastEvaluatedAt);
  refreshExpression(pet);
  return pet;
}
function updateProfile(original, patch) {
  const pet = migratePet(original);
  pet.profile = { ...pet.profile, ...patch };
  validateProfile(pet.profile);
  pet.profile.name = pet.profile.name.trim();
  refreshExpression(pet);
  return pet;
}

// src/context.ts
import { createHash } from "node:crypto";
import { homedir as homedir2 } from "node:os";
import { join } from "node:path";
import { open, readdir, stat } from "node:fs/promises";
var MAX_FILE_BYTES = 2 * 1024 * 1024;
var MAX_FILES = 200;
var LABELS = { build: "\u6784\u5EFA", research: "\u7814\u7A76", create: "\u521B\u4F5C", learn: "\u5B66\u4E60", rest: "\u4F11\u606F" };
var RULES = {
  build: [/\b(?:implement|debug|bug|compile|deploy|refactor|repository|typescript|javascript|coding)\b/i, /开发|编程|代码|修复|构建|部署|调试|测试|仓库/],
  research: [/\b(?:research|paper|papers|literature|experiment|hypothesis|citation|citations|study)\b/i, /论文|文献|研究|实验|假设|引文|学术|调研/],
  create: [/\b(?:illustration|poster|artwork|story|poem|logo|animation|creative|drawing|design)\b/i, /插画|海报|绘画|创作|作曲|故事|诗歌|设计|生成图片|画一/],
  learn: [/\b(?:learn|teach|explain|tutorial|understand|lesson|practice)\b/i, /学习|教我|解释|教程|练习|理解|讲解/],
  rest: [/\b(?:rest|break|relax|sleep|pause)\b/i, /休息|放松|睡觉|暂停|休假/]
};
var digest = (value) => createHash("sha256").update(value).digest("hex");
function classify(text) {
  const scores = Object.entries(RULES).map(([kind, rules]) => ({ kind, score: rules.filter((rule) => rule.test(text)).length }));
  scores.sort((a, b) => b.score - a.score);
  return scores[0].score > 0 && scores[0].score > scores[1].score ? scores[0].kind : null;
}
function userText(record2) {
  if (record2?.type === "event_msg" && record2.payload?.type === "user_message") return typeof record2.payload.message === "string" ? record2.payload.message : null;
  if (record2?.type !== "response_item" || record2.payload?.type !== "message" || record2.payload.role !== "user") return null;
  if (!Array.isArray(record2.payload.content)) return null;
  return record2.payload.content.filter((part) => part?.type === "input_text" || part?.type === "text").map((part) => typeof part.text === "string" ? part.text : "").join("\n");
}
function cleanText(text) {
  return text.replace(/<(environment_context|recommended_plugins|send_user_message_question_reply)\b[^>]*>[\s\S]*?<\/\1>/gi, "").replace(/<\/?(?:environment_context|recommended_plugins|send_user_message_question_reply)\b[^>]*>[\s\S]*$/gi, "").replace(/\s+/g, " ").trim().slice(0, 16e3);
}
async function scanCodexContext(options = {}) {
  const nowMs = options.nowMs ?? Date.now();
  const hours = options.hours ?? 5;
  if (!Number.isFinite(nowMs) || !Number.isFinite(hours) || hours <= 0 || hours > 168) throw new Error("Context window must be between 0 and 168 hours with a finite clock.");
  const startMs = nowMs - hours * 36e5;
  const root = options.codexHome ?? process.env.CODEX_HOME ?? join(homedir2(), ".codex");
  const result = { entries: [], stats: { files: 0, messages: 0 }, warnings: [] };
  const warnings = /* @__PURE__ */ new Set();
  const candidates = [];
  try {
    const all = (await readdir(join(root, "sessions"), { recursive: true, withFileTypes: true })).filter((f) => f.isFile() && f.name.endsWith(".jsonl"));
    for (let i = 0; i < all.length; i += 32) {
      const batch = await Promise.all(all.slice(i, i + 32).map(async (f) => {
        const file = join(f.parentPath, f.name);
        const info = await stat(file).catch(() => null);
        return info && info.mtimeMs >= startMs ? { file, mtime: info.mtimeMs } : null;
      }));
      candidates.push(...batch.filter((v) => v !== null));
    }
    candidates.sort((a, b) => b.mtime - a.mtime);
  } catch (error) {
    if (error.code !== "ENOENT") warnings.add("\u90E8\u5206\u672C\u5730\u4F1A\u8BDD\u76EE\u5F55\u65E0\u6CD5\u8BFB\u53D6\u3002");
  }
  for (const candidate of candidates) {
    if (result.stats.files >= MAX_FILES) {
      warnings.add("\u5DF2\u8FBE\u5230 200 \u4E2A\u4F1A\u8BDD\u6587\u4EF6\u4E0A\u9650\uFF1B\u672C\u6B21\u7ED3\u679C\u53EF\u80FD\u4E0D\u5B8C\u6574\u3002");
      break;
    }
    result.stats.files++;
    let text;
    let handle;
    try {
      handle = await open(candidate.file, "r");
      const stat3 = await handle.stat();
      const headerBuffer = Buffer.alloc(Math.min(stat3.size, 128 * 1024));
      const headerRead = await handle.read(headerBuffer, 0, headerBuffer.length, 0);
      const header = headerBuffer.subarray(0, headerRead.bytesRead).toString("utf8");
      let metadata;
      try {
        metadata = JSON.parse(header.split("\n")[0]);
      } catch {
      }
      const source = metadata?.type === "session_meta" ? metadata.payload?.source : null;
      if (source && typeof source === "object" && "subagent" in source || typeof source === "string" && source.includes("subagent")) continue;
      const count = Math.min(stat3.size, MAX_FILE_BYTES);
      const start = Math.max(0, stat3.size - count);
      const buffer = Buffer.alloc(count);
      const read = await handle.read(buffer, 0, count, start);
      text = buffer.subarray(0, read.bytesRead).toString("utf8");
      if (start > 0) {
        text = header.slice(0, header.lastIndexOf("\n")) + "\n" + text.slice(text.indexOf("\n") + 1);
        warnings.add("\u8F83\u5927\u4F1A\u8BDD\u4EC5\u68C0\u67E5\u524D 128 KiB \u548C\u6700\u540E 2 MiB\uFF1B\u4E2D\u95F4\u7EBF\u7D22\u53EF\u80FD\u88AB\u7701\u7565\u3002");
      }
    } catch {
      warnings.add("\u90E8\u5206\u672C\u5730\u4F1A\u8BDD\u6587\u4EF6\u65E0\u6CD5\u8BFB\u53D6\u3002");
      continue;
    } finally {
      await handle?.close();
    }
    const seen = /* @__PURE__ */ new Set();
    const matches = /* @__PURE__ */ new Map();
    for (const line of text.split("\n")) {
      if (!line.trim()) continue;
      let record2;
      try {
        record2 = JSON.parse(line);
      } catch {
        warnings.add("\u90E8\u5206\u4F1A\u8BDD\u5305\u542B\u672A\u5B8C\u6210\u6216\u65E0\u6548\u8BB0\u5F55\uFF0C\u5DF2\u8DF3\u8FC7\u3002");
        continue;
      }
      const at = typeof record2.timestamp === "number" ? record2.timestamp : Date.parse(record2.timestamp);
      if (!Number.isFinite(at) || at < startMs || at > nowMs) continue;
      const raw = userText(record2);
      if (!raw) continue;
      if (raw.includes("<heartbeat>") || /^\s*[/\$](?:genpet:)?genpet-(?:start|reset|grow|state)\b/.test(raw)) continue;
      const prompt = cleanText(raw);
      if (!prompt || prompt.startsWith("# AGENTS.md instructions") || prompt.startsWith("<permissions instructions>")) continue;
      const promptId = digest(prompt);
      if (seen.has(promptId)) continue;
      seen.add(promptId);
      result.stats.messages++;
      const kind2 = classify(prompt);
      if (!kind2) continue;
      const group = matches.get(kind2) ?? { count: 0, at, ids: [] };
      group.count = Math.min(3, group.count + 1);
      group.at = Math.max(group.at, at);
      group.ids.push(promptId);
      matches.set(kind2, group);
    }
    const ranked = [...matches.entries()].sort((a, b) => b[1].count - a[1].count);
    if (!ranked.length || ranked[1] && ranked[0][1].count === ranked[1][1].count) continue;
    const [kind, evidence] = ranked[0];
    const externalId = `codex-local:${digest(`${candidate.file}:${kind}:${Math.floor(evidence.at / 18e6)}`).slice(0, 24)}`;
    result.entries.push({ kind, summary: `\u672C\u5730 Codex \xB7 ${LABELS[kind]} \xB7 ${evidence.count} \u6761\u4EFB\u52A1\u7EBF\u7D22`, source: "codex-local", occurredAt: evidence.at, externalId });
  }
  result.entries.sort((a, b) => a.occurredAt - b.occurredAt || a.externalId.localeCompare(b.externalId));
  result.warnings = [...warnings];
  return result;
}
function summarizeInitialActivity(scan) {
  const counts = { build: 0, research: 0, create: 0, learn: 0, rest: 0 };
  for (const entry of scan.entries) counts[entry.kind]++;
  const ranked = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
  const selected = counts[ranked[0]] > 0 && counts[ranked[0]] > counts[ranked[1]] ? ranked[0] : null;
  return { counts, selected, classifiedTaskCount: scan.entries.length };
}
function deriveInitialProfile(scan) {
  const { selected } = summarizeInitialActivity(scan);
  if (!selected) return {};
  switch (selected) {
    case "build":
      return { interest: "build", palette: "sage", temperament: "calm" };
    case "research":
      return { interest: "research", palette: "sky", temperament: "curious" };
    case "create":
      return { interest: "create", palette: "peach", temperament: "playful" };
    case "learn":
      return { interest: "learn", palette: "lilac", temperament: "curious" };
    case "rest":
      return { palette: "sage", temperament: "calm" };
  }
}

// src/config.ts
import { readFile } from "node:fs/promises";
import path3 from "node:path";

// src/plugin-root.ts
import { existsSync } from "node:fs";
import path2 from "node:path";
import { fileURLToPath } from "node:url";
function pluginRoot() {
  const moduleDirectory = path2.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path2.resolve(moduleDirectory, ".."),
    path2.resolve(moduleDirectory, "..", "plugins", "genpet")
  ];
  return candidates.find((candidate) => existsSync(path2.join(candidate, ".codex-plugin", "plugin.json"))) ?? candidates[0];
}

// src/config.ts
async function adoptionConfig() {
  const file = process.env.GENPET_POLICY_FILE || path3.join(pluginRoot(), "config", "policy.json");
  const config = JSON.parse(await readFile(file, "utf8"));
  if (!config || typeof config !== "object" || !config.defaultProfile || !config.timing) throw new Error("Invalid GenPet adoption policy");
  return config;
}

// src/store.ts
var dataRoot = () => process.env.GENPET_DATA_DIR || path4.join(homedir3(), ".genpet");
var fresh = () => ({ version: 1, pet: null, clockOffset: 0, settings: { autoContext: true, freezeOutfit: false, autoArt: true }, importedIds: [], lastScanAt: 0, scanInfo: { messages: 0, files: 0, warnings: [] }, art: [] });
function configureState(s, input) {
  if (input.freezeOutfit === true && !s.settings.freezeOutfit) s.settings.lockedOutfit = { prop: s.pet?.state.prop || "none", scene: s.pet?.state.scene || "nest" };
  if (input.freezeOutfit === false) delete s.settings.lockedOutfit;
  for (const key of ["autoContext", "freezeOutfit", "autoArt"]) if (typeof input[key] === "boolean") s.settings[key] = input[key];
  return s.settings;
}
var Store = class {
  constructor(root = dataRoot(), demo = false) {
    this.root = root;
    this.demo = demo;
    this.file = path4.join(root, demo ? "demo.json" : "state.json");
  }
  root;
  demo;
  file;
  now(state) {
    return Date.now() + (this.demo ? state.clockOffset : 0) + (state.debug?.growthOffsetMs || 0);
  }
  async transaction(fn) {
    await mkdir(this.root, { recursive: true, mode: 448 });
    const lock = this.file + ".lock";
    let acquired = false;
    for (let i = 0; i < 100; i++) {
      try {
        await mkdir(lock);
        acquired = true;
        break;
      } catch (e) {
        if (e.code !== "EEXIST") throw e;
        const age = await stat2(lock).then((s) => Date.now() - s.mtimeMs).catch(() => 0);
        if (age > 12e4) await rm(lock, { recursive: true, force: true });
        else await new Promise((r) => setTimeout(r, 50));
      }
    }
    if (!acquired) throw new Error("GenPet is busy; retry shortly.");
    try {
      let state;
      try {
        state = JSON.parse(await readFile2(this.file, "utf8"));
      } catch (e) {
        if (e.code !== "ENOENT") throw new Error("State file cannot be read. It has been preserved; restore a backup instead of resetting it.");
        state = fresh();
      }
      if (state.version !== 1) throw new Error("Unsupported state version");
      if (state.pet) {
        state.pet = migratePet(state.pet);
        if (state.pet.stage === "egg" && state.identityReference) {
          state.eggReference ||= state.identityReference;
          delete state.identityReference;
        }
      }
      const result = await fn(state);
      const tmp = this.file + "." + randomUUID2() + ".tmp";
      await writeFile(tmp, JSON.stringify(state, null, 2), { mode: 384 });
      await rename(tmp, this.file);
      return result;
    } finally {
      await rm(lock, { recursive: true, force: true });
    }
  }
  async sync(s, force = false) {
    const now = this.now(s);
    const birthDue = s.pet && !s.pet.hatchIdentity && now >= s.pet.adoptedAt + s.pet.policy.hatchHours * HOUR;
    if (this.demo || !s.settings.autoContext || !force && !birthDue && Date.now() - s.lastScanAt < 6e4) return;
    const hours = birthDue ? Math.min(168, Math.max(5, (now - s.pet.adoptedAt) / HOUR)) : 5;
    const scan = await scanCodexContext({ nowMs: Date.now(), hours });
    s.scanInfo = { ...scan.stats, warnings: scan.warnings };
    s.lastScanAt = Date.now();
    if (s.pet) {
      const batch = [];
      for (const entry of scan.entries) {
        if (s.importedIds.includes(entry.externalId)) continue;
        const logicalAt = entry.occurredAt + (s.debug?.growthOffsetMs || 0);
        if (entry.occurredAt >= s.pet.adoptedAt && logicalAt >= now - s.pet.policy.contextRetentionDays * 24 * HOUR) batch.push({ ...entry, occurredAt: logicalAt });
        s.importedIds.push(entry.externalId);
      }
      s.pet = addContextBatch(s.pet, batch, now);
      s.importedIds = s.importedIds.slice(-3e3);
    }
  }
  async adopt(s, profile = {}) {
    if (s.pet) throw new Error("You already have a pet. Adoption never overwrites an existing companion.");
    let inferred = {};
    let activity = null;
    if (!this.demo && s.settings.autoContext) {
      const scan = await scanCodexContext({ nowMs: Date.now(), hours: 5 });
      inferred = deriveInitialProfile(scan);
      activity = summarizeInitialActivity(scan);
      s.scanInfo = { ...scan.stats, warnings: scan.warnings };
    }
    const config = await adoptionConfig();
    s.pet = createPet({ ...DEFAULT_PROFILE, ...config.defaultProfile, ...inferred, ...profile }, this.now(s), this.demo ? "genpet-demo-egg" : void 0, config.timing);
    s.pet.adoptionTrace = {
      algorithmVersion: "adoption-map-v1",
      mode: activity ? activity.selected ? "automatic" : "no-dominant-activity" : "disabled",
      selectedActivity: activity?.selected ?? null,
      activityCounts: activity?.counts ?? { build: 0, research: 0, create: 0, learn: 0, rest: 0 },
      explicitFields: ["name", "palette", "interest", "temperament"].filter((field2) => Object.hasOwn(profile, field2)),
      capturedAt: s.pet.adoptedAt
    };
    await this.sync(s, true);
    return s.pet;
  }
  /** Read persisted state without scanning, evolving, migrating or writing. */
  async peek() {
    try {
      const state = JSON.parse(await readFile2(this.file, "utf8"));
      if (state.version !== 1) throw new Error("Unsupported state version");
      return state;
    } catch (error) {
      if (error.code === "ENOENT") return fresh();
      throw error;
    }
  }
  async current() {
    return this.transaction(async (s) => {
      await this.sync(s);
      if (s.pet) s.pet = evolvePet(s.pet, this.now(s));
      return s;
    });
  }
};

// src/art.ts
import { mkdir as mkdir2, readFile as readFile5, copyFile, writeFile as writeFile2, rename as rename2 } from "node:fs/promises";
import path6 from "node:path";
import { createHash as createHash3, randomUUID as randomUUID3 } from "node:crypto";

// src/image.ts
var import_pngjs = __toESM(require_png(), 1);
import { readFile as readFile3 } from "node:fs/promises";
import { existsSync as existsSync2, readFileSync } from "node:fs";
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
    function locateFile(path10) {
      if (Module2["locateFile"]) {
        return Module2["locateFile"](path10, scriptDirectory);
      }
      return scriptDirectory + path10;
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
    function __embind_register_bigint(primitiveType, name, size, minRange, maxRange) {
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
    function makeLegalFunctionName(name) {
      if (void 0 === name) {
        return "_unknown";
      }
      name = name.replace(/[^a-zA-Z0-9_]/g, "$");
      var f = name.charCodeAt(0);
      if (f >= char_0 && f <= char_9) {
        return "_" + name;
      }
      return name;
    }
    function createNamedFunction(name, body) {
      name = makeLegalFunctionName(name);
      return { [name]: function() {
        return body.apply(this, arguments);
      } }[name];
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
      var name = registeredInstance.name;
      if (!rawType) {
        throwBindingError('type "' + name + '" must have a positive integer typeid pointer');
      }
      if (registeredTypes.hasOwnProperty(rawType)) {
        if (options.ignoreDuplicateRegistrations) {
          return;
        } else {
          throwBindingError("Cannot register type '" + name + "' twice");
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
    function __embind_register_bool(rawType, name, size, trueValue, falseValue) {
      var shift = getShiftFromSize(size);
      name = readLatin1String(name);
      registerType(rawType, { name, "fromWireType": function(wt) {
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
          throw new TypeError("Unknown boolean type size: " + name);
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
    function __embind_register_emval(rawType, name) {
      name = readLatin1String(name);
      registerType(rawType, { name, "fromWireType": function(handle) {
        var rv = Emval.toValue(handle);
        __emval_decref(handle);
        return rv;
      }, "toWireType": function(destructors, value) {
        return Emval.toHandle(value);
      }, "argPackAdvance": 8, "readValueFromPointer": simpleReadValueFromPointer, destructorFunction: null });
    }
    function floatReadValueFromPointer(name, shift) {
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
          throw new TypeError("Unknown float type: " + name);
      }
    }
    function __embind_register_float(rawType, name, size) {
      var shift = getShiftFromSize(size);
      name = readLatin1String(name);
      registerType(rawType, { name, "fromWireType": function(value) {
        return value;
      }, "toWireType": function(destructors, value) {
        return value;
      }, "argPackAdvance": 8, "readValueFromPointer": floatReadValueFromPointer(name, shift), destructorFunction: null });
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
    function exposePublicSymbol(name, value, numArguments) {
      if (Module2.hasOwnProperty(name)) {
        if (void 0 === numArguments || void 0 !== Module2[name].overloadTable && void 0 !== Module2[name].overloadTable[numArguments]) {
          throwBindingError("Cannot register public name '" + name + "' twice");
        }
        ensureOverloadTable(Module2, name, name);
        if (Module2.hasOwnProperty(numArguments)) {
          throwBindingError("Cannot register multiple overloads of a function with the same number of arguments (" + numArguments + ")!");
        }
        Module2[name].overloadTable[numArguments] = value;
      } else {
        Module2[name] = value;
        if (void 0 !== numArguments) {
          Module2[name].numArguments = numArguments;
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
    function replacePublicSymbol(name, value, numArguments) {
      if (!Module2.hasOwnProperty(name)) {
        throwInternalError("Replacing nonexistant public symbol");
      }
      if (void 0 !== Module2[name].overloadTable && void 0 !== numArguments) {
        Module2[name].overloadTable[numArguments] = value;
      } else {
        Module2[name] = value;
        Module2[name].argCount = numArguments;
      }
    }
    function dynCallLegacy(sig, ptr, args) {
      var f = Module2["dynCall_" + sig];
      return args && args.length ? f.apply(null, [ptr].concat(args)) : f.call(null, ptr);
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
    function dynCall(sig, ptr, args) {
      if (sig.includes("j")) {
        return dynCallLegacy(sig, ptr, args);
      }
      var rtn = getWasmTableEntry(ptr).apply(null, args);
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
    function __embind_register_function(name, argCount, rawArgTypesAddr, signature, rawInvoker, fn, isAsync) {
      var argTypes = heap32VectorToArray(argCount, rawArgTypesAddr);
      name = readLatin1String(name);
      rawInvoker = embind__requireFunction(signature, rawInvoker);
      exposePublicSymbol(name, function() {
        throwUnboundTypeError("Cannot call " + name + " due to unbound types", argTypes);
      }, argCount - 1);
      whenDependentTypesAreResolved([], argTypes, function(argTypes2) {
        var invokerArgsArray = [argTypes2[0], null].concat(argTypes2.slice(1));
        replacePublicSymbol(name, craftInvokerFunction(name, invokerArgsArray, null, rawInvoker, fn, isAsync), argCount - 1);
        return [];
      });
    }
    function integerReadValueFromPointer(name, shift, signed) {
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
          throw new TypeError("Unknown integer type: " + name);
      }
    }
    function __embind_register_integer(primitiveType, name, size, minRange, maxRange) {
      name = readLatin1String(name);
      if (maxRange === -1) {
        maxRange = 4294967295;
      }
      var shift = getShiftFromSize(size);
      var fromWireType = (value) => value;
      if (minRange === 0) {
        var bitshift = 32 - 8 * size;
        fromWireType = (value) => value << bitshift >>> bitshift;
      }
      var isUnsignedType = name.includes("unsigned");
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
      registerType(primitiveType, { name, "fromWireType": fromWireType, "toWireType": toWireType, "argPackAdvance": 8, "readValueFromPointer": integerReadValueFromPointer(name, shift, minRange !== 0), destructorFunction: null });
    }
    function __embind_register_memory_view(rawType, dataTypeIndex, name) {
      var typeMapping = [Int8Array, Uint8Array, Int16Array, Uint16Array, Int32Array, Uint32Array, Float32Array, Float64Array];
      var TA = typeMapping[dataTypeIndex];
      function decodeMemoryView(handle) {
        handle = handle >> 2;
        var heap = HEAPU32;
        var size = heap[handle];
        var data = heap[handle + 1];
        return new TA(heap.buffer, data, size);
      }
      name = readLatin1String(name);
      registerType(rawType, { name, "fromWireType": decodeMemoryView, "argPackAdvance": 8, "readValueFromPointer": decodeMemoryView }, { ignoreDuplicateRegistrations: true });
    }
    function __embind_register_std_string(rawType, name) {
      name = readLatin1String(name);
      var stdStringIsUTF8 = name === "std::string";
      registerType(rawType, { name, "fromWireType": function(value) {
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
    function __embind_register_std_wstring(rawType, charSize, name) {
      name = readLatin1String(name);
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
      registerType(rawType, { name, "fromWireType": function(value) {
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
          throwBindingError("Cannot pass non-string to C++ string type " + name);
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
    function __embind_register_void(rawType, name) {
      name = readLatin1String(name);
      registerType(rawType, { isVoid: true, name, "argPackAdvance": 0, "fromWireType": function() {
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
    function __emval_get_global(name) {
      if (name === 0) {
        return Emval.toHandle(emval_get_global());
      } else {
        name = getStringOrSymbol(name);
        return Emval.toHandle(emval_get_global()[name]);
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
      return function(constructor, argTypes, args) {
        argsList[0] = constructor;
        for (var i = 0; i < argCount; ++i) {
          var argType = requireRegisteredType(HEAPU32[argTypes + i * 4 >> 2], "parameter " + i);
          argsList[i + 1] = argType["readValueFromPointer"](args);
          args += argType["argPackAdvance"];
        }
        var obj = new (constructor.bind.apply(constructor, argsList))();
        return Emval.toHandle(obj);
      };
    }
    var emval_newers = {};
    function __emval_new(handle, argCount, argTypes, args) {
      handle = Emval.toValue(handle);
      var newer = emval_newers[argCount];
      if (!newer) {
        newer = craftEmvalAllocator(argCount);
        emval_newers[argCount] = newer;
      }
      return newer(handle, argTypes, args);
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
    if (chunk === "VP8X") return { format: "webp", width: 1 + buf.readUIntLE(24, 3), height: 1 + buf.readUIntLE(27, 3), hasAlpha: (buf[20] & 16) !== 0 };
    if (chunk === "VP8L") {
      const bits = buf.readUInt32LE(21);
      return { format: "webp", width: 1 + (bits & 16383), height: 1 + (bits >>> 14 & 16383), hasAlpha: (bits >>> 28 & 1) === 1 };
    }
    if (chunk === "VP8 ") return { format: "webp", width: buf.readUInt16LE(26) & 16383, height: buf.readUInt16LE(28) & 16383, hasAlpha: false };
  }
  throw new Error("Use a PNG or WebP image");
}
async function readImageInfo(file) {
  return imageInfo(await readFile3(file));
}
var webpReady;
function webpWasm() {
  const bundled = fileURLToPath2(new URL("./webp_dec.wasm", import.meta.url));
  return existsSync2(bundled) ? bundled : createRequire(import.meta.url).resolve("@jsquash/webp/codec/dec/webp_dec.wasm");
}
async function decodeRgba(file) {
  const buf = await readFile3(file);
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
  webpReady ??= WebAssembly.compile(readFileSync(webpWasm())).then((module) => init(module));
  await webpReady;
  const decoded = await decode(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  return { ...info, data: new Uint8Array(decoded.data.buffer, decoded.data.byteOffset, decoded.data.byteLength) };
}

// src/native-refresh.ts
import { createHash as createHash2 } from "node:crypto";
import { readFile as readFile4, readdir as readdir2 } from "node:fs/promises";
import { homedir as homedir4, tmpdir } from "node:os";
import path5 from "node:path";
async function refreshNativePet(options) {
  const expectedSpriteSha256 = createHash2("sha256").update(await readFile4(options.expectedSpritePath)).digest("hex");
  const errors = [];
  const useIpc = options.ipcSocketPath !== null && (typeof options.ipcSocketPath === "string" || isLiveNativeDestination(path5.dirname(options.expectedSpritePath)));
  if (useIpc) {
    try {
      const ipc = await refreshViaIpc(options.ipcSocketPath ?? void 0, options.timeoutMs ?? 2e3);
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
    errors: errors.length ? errors : void 0
  };
}
function isLiveNativeDestination(destination) {
  if (process.env.GENPET_SKIP_NATIVE_REFRESH === "1") return false;
  const live = path5.join(homedir4(), ".codex", "pets", "genpet-companion");
  if (path5.resolve(destination) === path5.resolve(live)) return true;
  const configured = process.env.CODEX_HOME;
  if (!configured) return false;
  const resolved = path5.resolve(configured);
  const temp = path5.resolve(tmpdir());
  const relativeToTemp = path5.relative(temp, resolved);
  if (configured.startsWith("/var/folders/") || configured.includes("/tmp/") || relativeToTemp === "" || relativeToTemp !== ".." && !relativeToTemp.startsWith(`..${path5.sep}`) && !path5.isAbsolute(relativeToTemp)) return false;
  return path5.resolve(destination) === path5.resolve(path5.join(resolved, "pets", "genpet-companion"));
}
async function listInstalledSprites(destination) {
  try {
    const names = await readdir2(destination);
    return names.filter((name) => name.startsWith("spritesheet"));
  } catch {
    return [];
  }
}

// src/art.ts
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
function artRequest(s) {
  const p = s.pet;
  if (!p) return null;
  const isEgg = p.stage === "egg";
  const maturity = growthMaturity(p.growth.days, p.policy.adultDays);
  const proportions = { torsoLengthRelativeToBirth: Number((1 + 0.4 * maturity).toFixed(3)), limbLengthRelativeToBirth: Number((1 + 0.3 * maturity).toFixed(3)), headShape: "preserve-canonical" };
  const forced = s.debug?.stateOverride;
  const outfit = forced ? forced.kind === "none" ? { prop: "none", scene: "nest" } : situations[forced.kind] : s.settings.freezeOutfit && s.settings.lockedOutfit ? s.settings.lockedOutfit : p.state;
  const visual = {
    id: p.id,
    seed: p.seed,
    stage: p.stage,
    day: p.growth.days,
    palette: p.profile.palette,
    dna: p.dna,
    hatchIdentity: isEgg ? null : p.hatchIdentity,
    growth: isEgg ? null : { size: p.growth.size, expression: p.growth.temperament, decorationLevel: p.growth.decorationLevel, proportions },
    prop: isEgg ? "none" : outfit.prop,
    scene: isEgg ? "nest" : outfit.scene
  };
  const id = createHash3("sha256").update(JSON.stringify(visual)).digest("hex").slice(0, 20);
  const current = s.art.find((a) => a.id === id && a.kind === "atlas");
  const latestPortrait = [...s.art].reverse().find((a) => a.kind === "portrait" && a.stage !== "egg")?.file;
  const references = isEgg ? [s.eggReference] : s.identityReference ? [s.identityReference, latestPortrait] : [s.eggReference];
  const birthMarkZone = ["lower left belly", "upper right shoulder", "low central belly", "lower right belly"][p.dna.patternSeed % 4];
  const birthMark = `At first birth, carry exactly one restrained asymmetrical identity mark: echo 1\u20133 tiny abstract ${p.dna.pattern} fragments on the ${birthMarkZone}. This is a seed-derived permanent marking, not the changing task prop. It must not depict a face, symbol, species or outfit. After the first approved portrait, preserve the realized mark rather than recomputing it.`;
  const bodyInstruction = { round: "a compact near-circular torso", pear: "a tapered upper torso visibly fuller at the lower belly", bean: "a soft bean-like asymmetric torso with a gentle side curve" }[p.hatchIdentity?.bodyShape || "round"];
  const appendageInstruction = {
    buds: "one pair of small rounded buds attached to the lower side contours of the HEAD",
    leaflets: "one pair of short soft leaflets attached to the sides of the HEAD",
    "soft-fins": "one pair of small fleshy lateral fins attached to the sides of the HEAD"
  }[p.hatchIdentity?.appendage || "buds"];
  const birthGeometry = `The selected seed-derived morphology for THIS newborn is ${bodyInstruction} and ${appendageInstruction}. Render these exact targets visibly at 192x208 size; do not substitute another torso shape or appendage type. The two normal arms are separate from the head appendages.`;
  const coverage = isEgg ? "Use the GenPet egg-three profile: one canonical shell and three AI-generated eight-frame loops (egg-calm, egg-stir, egg-settle). Reuse these generated frames across native state rows and one neutral calm frame across all sixteen look slots. No separate character actions or directional gaze exist before birth. Record frame selection and reuse honestly; never synthesize motion in code." : "Generate base first, then all nine state rows and both eight-pose look rows independently from base with imagegen. Each action row must show consecutive time frames of ONE continuous looping action with fixed props, camera and body orientation, not a collection of alternative expressions. Look rows allow natural head and body turns, tilts and bends toward the screen-space target, preserving identity, body size and continuity between neighboring directions. Never synthesize missing animation in code.";
  const common = "Use the GenPet artwork execution path and native Codex Pet visual language: crisp low-resolution pixel art, stepped dark outlines, a limited palette with two or three shade levels. NOT plush, felt, fur, clay, painterly or 3D rendering. Private task text must never appear in the image or prompt. " + coverage + " Assemble and validate a transparent 8x11 v2 atlas. Use any contrasting uniform solid background; no exact color code, separator lines, borders or grids. Visually review each generated source against its action requirements, then process deterministically and validate structure. Before installation, inspect the final idle-jump and idle-look previews for size consistency, cardinal directions and continuity.";
  const concept = isEgg ? `EGG FIRST: create an ordinary intact egg, not a disguised animal. No future creature has been selected or generated. The egg's silhouette is a simple ovate shell in warm ivory/gray. At most 5\u201310% of its surface carries extremely faint ${p.profile.palette} tint and sparse abstract ${p.dna.pattern} hints, variant ${p.dna.patternSeed}. No eyes, mouth, face, ears, limbs, leaves, recognizable creature pattern, or heraldic symbol. The hints must not reveal a species. Do not reference any hatchling or reverse-engineer an egg from one. The Pet is not born yet. Motion is limited to calm shell wobble, stronger stirring and a brief disturbed tilt that settles. No jumping, cracking, blinking, exposed creature, gaze following, working, reviewing or detached effects.` : `${s.identityReference ? "CONTINUE THE SAME REVEALED INDIVIDUAL. Preserve its approved face, palette, anatomy and identity marks exactly; change proportions and small accessories within the existing character." : `FORWARD HATCHING: this is the first time the creature is designed. The egg reference supplies only a subtle color echo and one abstract pattern echo; do not turn the egg silhouette or markings into a face. Design a distinct organism silhouette and head construction; the shell outline is not a head template. There is no predetermined adult to reverse-engineer. Create an organic fantasy creature within the shared rounded pixel family: a broad horizontal oval head with a blunt top, separate compact torso, tiny square eyes without bright highlights, a tiny mouth, two short arms and two short feet. Do not use a pointed egg-shaped head or shell-like ivory surface. ${birthGeometry} Keep buds under 10% of head width, leaflets under 15%, and fins similarly small. ${birthMark} Use the newly resolved birth identity below.`} Birth identity: ${JSON.stringify(p.hatchIdentity)}. Stage ${p.stage}, growth day ${p.growth.days}, normalized size ${p.growth.size.toFixed(2)} (adult maximum 1.25; keep native cell margins), expression weights ${JSON.stringify(p.growth.temperament)}, keepsake level ${p.growth.decorationLevel}/3. Aim for gradual growth within native cell fitting; subtle differences in a single update are acceptable. Relative to the first approved hatchling, target torso length multiplier ${proportions.torsoLengthRelativeToBirth} and limb length multiplier ${proportions.limbLengthRelativeToBirth}; keep canonical head outline, facial features, palette and marks. Show maturity through torso-to-head and limb proportions, not merely enlarging the whole sprite. Do not shrink or recolor a prop to fake body growth. These are character design parameters, not a diagnosis of the user. Current prop: ${visual.prop}. Scene cue ${visual.scene} belongs in the habitat, not the transparent sprite. The approved realized character takes precedence over approximate initial targets; record deviations in provenance and never redraw identity to repair an old target.`;
  return {
    id,
    status: current ? "ready" : s.settings.autoArt ? "pending" : "paused",
    phase: isEgg ? "incubating" : "revealed",
    visual,
    adoptionTrace: p.adoptionTrace ?? null,
    referenceFiles: [...new Set(references.filter((f) => !!f))],
    prompt: common + " " + concept,
    reason: isEgg ? "Only an abstract shell identity exists. The creature will be resolved at the five-hour hatch boundary." : forced ? `Explicit debug state: ${forced.kind}; not observed user activity. Use debug-state auto to resume activity-based appearance.` : p.state.reason,
    contract: { columns: 8, cellWidth: 192, cellHeight: 208, rows: 11, spriteVersionNumber: 2 },
    note: "Image synthesis runs in Codex through the GenPet skill. State hatching and completion of new artwork are separate. Preserve the last approved native atlas until its successor passes structural validation."
  };
}
async function validateImage(file, kind) {
  const meta = await readImageInfo(file);
  if (!meta.hasAlpha) throw new Error("The image must have an alpha channel");
  if (kind === "atlas" && (meta.width !== 1536 || ![1872, 2288].includes(meta.height || 0))) throw new Error("Atlas must be 1536 \xD7 1872 (v1) or 1536 \xD7 2288 (v2)");
  if ((meta.width || 0) * (meta.height || 0) > 16e6) throw new Error("Image exceeds size limit");
  if (kind === "atlas") {
    const { data, width } = await decodeRgba(file);
    for (let row = 0; row < (meta.height === 2288 ? 11 : 9); row++) for (let col = 0; col < 8; col++) {
      let visible = 0;
      const count = row < 9 ? actions[row].count : 8;
      const used = col < count || meta.height === 2288 && row === 0 && col === 6;
      for (let y = row * 208; y < (row + 1) * 208; y++) for (let x = col * 192; x < (col + 1) * 192; x++) if (data[(y * width + x) * 4 + 3] > 0) visible++;
      if (used && visible < 30) throw new Error(`Empty animation cell ${row},${col}`);
      if (!used && visible > 0) throw new Error(`Unused cell ${row},${col} must be transparent`);
    }
  }
  return meta;
}
async function exportNative(s, destination) {
  if (!s.pet) throw new Error("Adopt a pet first");
  const request = artRequest(s);
  const art = [...s.art].reverse().find((a) => a.kind === "atlas" && a.id === request.id);
  if (!art) throw new Error("No approved atlas for this current design yet. Run the GenPet image-generation skill first.");
  const meta = await validateImage(art.file, "atlas");
  await mkdir2(destination, { recursive: true });
  const ext = path6.extname(art.file);
  const hash2 = createHash3("sha256").update(await readFile5(art.file)).digest("hex").slice(0, 16);
  const spriteName = `spritesheet-${hash2}${ext}`;
  const sprite = path6.join(destination, spriteName);
  const temporary = path6.join(destination, `.pending-${randomUUID3()}${ext}`);
  await copyFile(art.file, temporary);
  await rename2(temporary, sprite);
  const manifest = { id: path6.basename(destination), displayName: s.pet.profile.name, description: "GenPet \xB7 a growing image-generated companion", spriteVersionNumber: meta.height === 2288 ? 2 : 1, spritesheetPath: spriteName };
  await copyFile(path6.join(destination, "pet.json"), path6.join(destination, "previous-pet.json")).catch((e) => {
    if (e.code !== "ENOENT") throw e;
  });
  const manifestTemporary = path6.join(destination, `.pet-${randomUUID3()}.json`);
  await writeFile2(manifestTemporary, JSON.stringify(manifest, null, 2));
  await rename2(manifestTemporary, path6.join(destination, "pet.json"));
  return {
    destination,
    manifest,
    artId: art.id,
    artCreatedAt: art.createdAt,
    filesCommitted: true,
    automaticRefresh: false,
    displayStatus: "unconfirmed",
    refreshRequired: true,
    notice: "Files committed to the same GenPet entry. Host display refresh has not run yet; call install-native to trigger automatic refresh, or use the refresh adapter."
  };
}
async function installNative(store, options) {
  if (store.demo) throw new Error("Demo state cannot install a native Pet. Use isolated file exports for developer tests; the live companion is updated in place.");
  const s = await store.current();
  const result = await exportNative(s, path6.join(process.env.CODEX_HOME || path6.join((await import("node:os")).homedir(), ".codex"), "pets", "genpet-companion"));
  let refresh;
  const injected = typeof options?.refresh === "function";
  const skip = !injected && process.env.GENPET_SKIP_NATIVE_REFRESH === "1";
  const shouldRefresh = injected || !skip && isLiveNativeDestination(result.destination);
  if (shouldRefresh) {
    const spritePath = path6.join(result.destination, result.manifest.spritesheetPath);
    refresh = await (options?.refresh ?? refreshNativePet)({ expectedSpritePath: spritePath });
  }
  const automaticRefresh = refresh?.automaticRefresh ?? false;
  const displayStatus = refresh?.displayStatus ?? "unconfirmed";
  const notice = refresh?.notice ?? "Files committed to the same GenPet entry. Host refresh was skipped for this non-live destination; visible update remains unconfirmed.";
  await store.transaction((state) => {
    state.nativeExport = { artId: result.artId, artCreatedAt: result.artCreatedAt, at: Date.now(), destination: result.destination, refreshRequired: !automaticRefresh };
  });
  return { ...result, automaticRefresh, displayStatus, refreshRequired: !automaticRefresh, notice, refresh };
}

// src/native-pets.ts
import { readFile as readFile6, readdir as readdir3 } from "node:fs/promises";
import { homedir as homedir5 } from "node:os";
import path7 from "node:path";

// node_modules/smol-toml/dist/error.js
function getLineColFromPtr(string, ptr) {
  let lines = string.slice(0, ptr).split(/\r?\n/);
  return [lines.length, lines.pop().length + 1];
}
function makeCodeBlock(string, line, column) {
  let lines = string.split(/\r?\n/);
  let codeblock = "";
  let numberLen = (Math.log10(line + 1) | 0) + 1;
  for (let i = line - 1; i <= line + 1; i++) {
    let l = lines[i - 1];
    if (!l)
      continue;
    codeblock += i.toString().padEnd(numberLen, " ");
    codeblock += ":  ";
    codeblock += l;
    codeblock += "\n";
    if (i === line) {
      codeblock += " ".repeat(numberLen + column + 2);
      codeblock += "^\n";
    }
  }
  return codeblock;
}
var TomlError = class _TomlError extends Error {
  line;
  column;
  codeblock;
  constructor(message, options) {
    const [line, column] = getLineColFromPtr(options.toml, options.ptr);
    const codeblock = makeCodeBlock(options.toml, line, column);
    super(`Invalid TOML document: ${message}

${codeblock}`, options);
    this.line = line;
    this.column = column;
    this.codeblock = codeblock;
  }
  /** @internal */
  static x(message, ctx, ptr) {
    throw new _TomlError(message, { toml: ctx.s, ptr: ptr ?? ctx.p });
  }
};

// node_modules/smol-toml/dist/primitive.js
function parseString(ctx) {
  let startPtr = ctx.p;
  let c = ctx.s.charCodeAt(ctx.p++);
  let first = c;
  let isLiteral = c === 39;
  let isMultiline = c === ctx.s.charCodeAt(ctx.p) && c === ctx.s.charCodeAt(ctx.p + 1);
  if (isMultiline) {
    if ((c = ctx.s.charCodeAt(ctx.p += 2)) === 10)
      ctx.p++;
    else if (c === 13 && ctx.s.charCodeAt(ctx.p + 1) === 10)
      ctx.p += 2;
  }
  let parsed = "";
  let sliceStart = ctx.p;
  let state = 0;
  for (; ctx.p < ctx.s.length; ctx.p++) {
    c = ctx.s.charCodeAt(ctx.p);
    if (isMultiline && (c === 10 || c === 13 && ctx.s.charCodeAt(ctx.p + 1) === 10)) {
      state = state && 3;
    } else if (c < 32 && c !== 9 || c === 127) {
      TomlError.x("control characters are not allowed in strings", ctx);
    } else if ((!state || state === 3) && c === first && (!isMultiline || ctx.s.charCodeAt(ctx.p + 1) === first && ctx.s.charCodeAt(ctx.p + 2) === first)) {
      if (isMultiline) {
        if (ctx.s.charCodeAt(ctx.p + 3) === first)
          ctx.p++;
        if (ctx.s.charCodeAt(ctx.p + 3) === first)
          ctx.p++;
      }
      if (!state) {
        let s = ctx.s.slice(sliceStart, ctx.p);
        parsed = parsed ? parsed + s : s;
      }
      ctx.p += isMultiline ? 3 : 1;
      return parsed;
    } else if (!state) {
      if (!isLiteral && c === 92) {
        parsed += ctx.s.slice(sliceStart, sliceStart = ctx.p);
        state = 1;
      }
    } else if (state === 1) {
      if (c === 120 || c === 117 || c === 85) {
        let errPtr = ctx.p++ - 1;
        let value = 0;
        let len = c === 120 ? 2 : c === 117 ? 4 : 8;
        for (let j = 0; j < len; j++, ctx.p++) {
          let hex = ctx.s.charCodeAt(ctx.p);
          let digit = (
            /* 0-9 */
            hex >= 48 && hex <= 57 ? hex - 48 : (
              /* A-F */
              hex >= 65 && hex <= 70 ? hex - 65 + 10 : (
                /* a-f */
                hex >= 97 && hex <= 102 ? hex - 97 + 10 : -1
              )
            )
          );
          if (digit < 0)
            TomlError.x("invalid non-hex character in unicode escape", ctx);
          value = value << 4 | digit;
        }
        if (value < 0 || value > 1114111 || value >= 55296 && value <= 57343) {
          TomlError.x("invalid unicode escape", ctx, errPtr);
        }
        parsed += String.fromCodePoint(value);
        sliceStart = ctx.p--;
        state = 0;
      } else if (isMultiline && (c === 32 || c === 9)) {
        state = 2;
      } else {
        if (c === 98)
          parsed += "\b";
        else if (c === 116)
          parsed += "	";
        else if (c === 110)
          parsed += "\n";
        else if (c === 102)
          parsed += "\f";
        else if (c === 114)
          parsed += "\r";
        else if (c === 101)
          parsed += "\x1B";
        else if (c === 34)
          parsed += '"';
        else if (c === 92)
          parsed += "\\";
        else
          TomlError.x("unrecognised escape sequence", ctx);
        sliceStart = ctx.p + 1;
        state = 0;
      }
    } else if (c !== 32 && c !== 9) {
      if (state === 2)
        TomlError.x("invalid escape: only line-ending whitespace may be escaped", ctx, sliceStart);
      state = !isLiteral && c === 92 ? 1 : 0;
      sliceStart = ctx.p;
    }
  }
  TomlError.x("unfinished string", ctx, startPtr);
}

// node_modules/smol-toml/dist/date.js
var DATE_TIME_RE = /^(\d{4}-\d{2}-\d{2})?[Tt ]?(?:(\d{2}):\d{2}(?::\d{2}(?:\.\d+)?)?)?(Z|z|[-+]\d{2}:\d{2})?$/i;
var TomlDate = class _TomlDate extends Date {
  #hasDate = false;
  #hasTime = false;
  #offset = null;
  constructor(date, fasttype, unsafeDelim) {
    let hasDate = true;
    let hasTime = true;
    let offset = "Z";
    let c;
    if (typeof date === "string") {
      if (fasttype)
        prep: {
          if (fasttype < 3) {
            if (+date.slice(11, 13) > 23) {
              date = "";
              break prep;
            }
            if (fasttype === 2) {
              offset = null;
              date += "Z";
            } else if ((c = date.charCodeAt(date.length - 1)) !== 90 && c !== 122) {
              offset = date.slice(date.length - 6);
            }
            if (unsafeDelim)
              date = date.slice(0, 10) + "T" + date.slice(11);
          } else if (fasttype === 4) {
            date = +date.slice(0, 2) > 23 ? "" : `0000-01-01T${date}Z`;
          }
          hasDate = fasttype !== 4;
          hasTime = fasttype !== 3;
        }
      else {
        let match = date.match(DATE_TIME_RE);
        if (match) {
          if (!match[1]) {
            hasDate = false;
            date = `0000-01-01T${date}`;
          }
          hasTime = !!match[2];
          hasTime && date[10] === " " && (date = date.replace(" ", "T"));
          if (match[2] && +match[2] > 23) {
            date = "";
          } else {
            offset = match[3] || null;
            if (!offset && hasTime)
              date += "Z";
          }
        } else {
          date = "";
        }
      }
    }
    super(date);
    if (!isNaN(this.getTime())) {
      this.#hasDate = hasDate;
      this.#hasTime = hasTime;
      this.#offset = offset;
    }
  }
  isDateTime() {
    return this.#hasDate && this.#hasTime;
  }
  isLocal() {
    return !this.#hasDate || !this.#hasTime || !this.#offset;
  }
  isDate() {
    return this.#hasDate && !this.#hasTime;
  }
  isTime() {
    return this.#hasTime && !this.#hasDate;
  }
  isValid() {
    return this.#hasDate || this.#hasTime;
  }
  toISOString() {
    let iso = super.toISOString();
    if (this.isDate())
      return iso.slice(0, 10);
    if (this.isTime())
      return iso.slice(11, 23);
    if (this.#offset === null)
      return iso.slice(0, -1);
    if (this.#offset === "Z" || this.#offset === "z")
      return iso;
    let offset = +this.#offset.slice(1, 3) * 60 + +this.#offset.slice(4, 6);
    offset = this.#offset[0] === "-" ? offset : -offset;
    let offsetDate = new Date(this.getTime() - offset * 6e4);
    return offsetDate.toISOString().slice(0, -1) + this.#offset;
  }
  static wrapAsOffsetDateTime(jsDate, offset = "Z") {
    let date = new _TomlDate(jsDate);
    date.#offset = offset;
    return date;
  }
  static wrapAsLocalDateTime(jsDate) {
    let date = new _TomlDate(jsDate);
    date.#offset = null;
    return date;
  }
  static wrapAsLocalDate(jsDate) {
    let date = new _TomlDate(jsDate);
    date.#hasTime = false;
    date.#offset = null;
    return date;
  }
  static wrapAsLocalTime(jsDate) {
    let date = new _TomlDate(jsDate);
    date.#hasDate = false;
    date.#offset = null;
    return date;
  }
};

// node_modules/smol-toml/dist/extract.js
function isDigit(char, base = 10) {
  return base === 16 ? char > 47 && char < 58 || char > 64 && char < 71 || char > 96 && char < 103 : char > 47 && char < 48 + base;
}
function isEndOfValue(char, delim) {
  return char === 32 || char === 9 || char === 10 || char === 13 || // Structure end or next value delimiter
  delim && (char === delim || char === 44) || // Comment
  char === 35;
}
function extractValue(ctx, end) {
  let errPtr = ctx.p;
  let c = ctx.s.charCodeAt(ctx.p);
  if (c === 91 || c === 123) {
    ctx.d-- || TomlError.x("document contains excessively nested structures. aborting.", ctx);
    let value = c === 91 ? parseArray(ctx) : parseInlineTable(ctx);
    ctx.d++;
    return value;
  }
  if (c === 34 || c === 39) {
    return parseString(ctx);
  }
  if (c === 116) {
    if (ctx.s.charCodeAt(++ctx.p) !== 114 || ctx.s.charCodeAt(++ctx.p) !== 117 || ctx.s.charCodeAt(++ctx.p) !== 101)
      TomlError.x("invalid value", ctx, errPtr);
    return ctx.p++, true;
  }
  if (c === 102) {
    if (ctx.s.charCodeAt(++ctx.p) !== 97 || ctx.s.charCodeAt(++ctx.p) !== 108 || ctx.s.charCodeAt(++ctx.p) !== 115 || ctx.s.charCodeAt(++ctx.p) !== 101)
      TomlError.x("invalid value", ctx, errPtr);
    return ctx.p++, false;
  }
  if (c === 43 || c === 45) {
    return parseNumber(ctx, ctx.p, ctx.s.charCodeAt(++ctx.p), 44 - c, end);
  }
  if (ctx.s.charCodeAt(ctx.p + 4) === 45 && ctx.s.charCodeAt(ctx.p + 7) === 45) {
    return parseDate(ctx, c, end);
  }
  if (ctx.s.charCodeAt(ctx.p + 2) === 58) {
    return parseTime(ctx, c, end);
  }
  return parseNumber(ctx, ctx.p, c, 0, end);
}
function parseNumber(ctx, startPtr, startChr, sign, endChr) {
  let c = startChr;
  let state = 0;
  let hasUnderscores = false;
  if (c === 105) {
    if (ctx.s.charCodeAt(++ctx.p) !== 110 || ctx.s.charCodeAt(++ctx.p) !== 102)
      TomlError.x("invalid value", ctx, startPtr);
    return ctx.p++, (sign || 1) / 0;
  }
  if (c === 110) {
    if (ctx.s.charCodeAt(++ctx.p) !== 97 || ctx.s.charCodeAt(++ctx.p) !== 110)
      TomlError.x("invalid value", ctx, startPtr);
    return ctx.p++, NaN;
  }
  if (c === 48) {
    if (++ctx.p >= ctx.s.length || isEndOfValue(c = ctx.s.charCodeAt(ctx.p), endChr))
      return ctx.bi === true ? 0n : 0;
    if (!sign) {
      if (c === 120)
        return parseIntegerBaseN(ctx, startPtr, 16, endChr);
      else if (c === 98)
        return parseIntegerBaseN(ctx, startPtr, 2, endChr);
      else if (c === 111)
        return parseIntegerBaseN(ctx, startPtr, 8, endChr);
    }
    if (c === 46)
      state = 2;
    else if (c === 101 || c === 69)
      state = 4;
    else
      TomlError.x("illegal leading zero", ctx, startPtr);
  } else if (!isDigit(c))
    TomlError.x("invalid value", ctx, startPtr);
  while (++ctx.p < ctx.s.length && (c = ctx.s.charCodeAt(ctx.p), !isEndOfValue(c, endChr))) {
    if (!state)
      state = 1;
    if (c === 95) {
      if (!(state & 1))
        TomlError.x("illegal underscore", ctx);
      state += 11;
      hasUnderscores = true;
    } else if (state === 1 && c === 46)
      state = 2;
    else if ((state === 1 || state === 3) && (c === 101 || c === 69))
      state = 4;
    else if (state === 4 && (c === 43 || c === 45)) {
    } else if (!isDigit(c))
      TomlError.x(`illegal character in numeric literal`, ctx);
    else if (state > 9)
      state -= 11;
    else if (!(state & 1))
      state++;
  }
  if (!state) {
    let val = (startChr - 48) * (sign || 1);
    return ctx.bi === true ? BigInt(val) : val;
  }
  if (!(state & 1))
    TomlError.x("unfinished numeric value", ctx, startPtr);
  let str = ctx.s.slice(startPtr, ctx.p);
  if (hasUnderscores)
    str = str.replaceAll("_", "");
  return state > 1 ? parseFloat(str) : parseInteger(ctx, str, 10, startPtr);
}
function parseIntegerBaseN(ctx, startPtr, base, endChr) {
  let c, underscore = 1;
  while (++ctx.p < ctx.s.length && (c = ctx.s.charCodeAt(ctx.p), !isEndOfValue(c, endChr))) {
    if (c === 95) {
      if (underscore & 1)
        TomlError.x("illegal underscore", ctx);
      underscore = 3;
    } else if (!isDigit(c, base))
      TomlError.x(`illegal character in numeric literal`, ctx);
    else if (underscore & 1)
      underscore--;
  }
  if (underscore & 1)
    TomlError.x("unfinished numeric value", ctx);
  let str = ctx.s.slice(startPtr + 2, ctx.p);
  if (underscore)
    str = str.replaceAll("_", "");
  return parseInteger(ctx, str, base, startPtr);
}
function parseInteger(ctx, str, base, startPtr) {
  if (ctx.bi !== true)
    int: {
      let val = parseInt(str, base);
      if (!Number.isSafeInteger(val)) {
        if (ctx.bi)
          break int;
        TomlError.x("integer value cannot be represented losslessly", ctx, startPtr);
      }
      return val;
    }
  return base === 10 ? BigInt(str) : BigInt((base === 2 ? "0b" : base === 8 ? "0o" : "0x") + str);
}
function parseDate(ctx, c, endChr) {
  let startPtr = ctx.p++, unsafeSeparator;
  if (!isDigit(c) || !isDigit(ctx.s.charCodeAt(ctx.p++)) || !isDigit(ctx.s.charCodeAt(ctx.p++)) || !isDigit(ctx.s.charCodeAt(ctx.p++))) {
    return parseNumber(ctx, ctx.p = startPtr, c, 0, endChr);
  }
  ctx.p += 5;
  if (!isDigit(ctx.s.charCodeAt(ctx.p++)))
    TomlError.x("invalid date-time: date part is malformed", ctx, startPtr);
  if (ctx.p >= ctx.s.length || ((c = ctx.s.charCodeAt(ctx.p)) !== 32 || (unsafeSeparator = true, !isDigit(ctx.s.charCodeAt(ctx.p + 1)))) && c !== 84 && c !== 116) {
    let t2 = ctx.s.slice(startPtr, ctx.p);
    return readDate(ctx, t2, 3, false, startPtr);
  }
  if (ctx.s.charCodeAt(ctx.p += 3) !== 58)
    TomlError.x("invalid date-time: time part is malformed", ctx, startPtr);
  if (ctx.s.charCodeAt(ctx.p += 3) === 58)
    ctx.p += 3;
  if (ctx.s.charCodeAt(ctx.p) === 46)
    while (isDigit(ctx.s.charCodeAt(++ctx.p)))
      ;
  if (c = ctx.s.charCodeAt(ctx.p)) {
    if (c === 90 || c === 122) {
      let t2 = ctx.s.slice(startPtr, ++ctx.p);
      return readDate(ctx, t2, 1, unsafeSeparator, startPtr, "[+00:00]");
    }
    if (c === 43 || c === 45) {
      let t2 = ctx.s.slice(startPtr, ctx.p += 6);
      return readDate(ctx, t2, 1, unsafeSeparator, startPtr, !ctx.ld && "[" + ctx.s.slice(ctx.p - 6, ctx.p) + "]");
    }
  }
  let t = ctx.s.slice(startPtr, ctx.p);
  return readDate(ctx, t, 2, unsafeSeparator, startPtr);
}
function parseTime(ctx, c, endChr) {
  let start = ctx.p;
  if (!isDigit(c) || !isDigit(ctx.s.charCodeAt(++ctx.p))) {
    return parseNumber(ctx, --ctx.p, c, 0, endChr);
  }
  if (ctx.s.charCodeAt(ctx.p += 4) === 58)
    ctx.p += 3;
  if (ctx.s.charCodeAt(ctx.p) === 46)
    while (isDigit(ctx.s.charCodeAt(++ctx.p)))
      ;
  let t = ctx.s.slice(start, ctx.p);
  return readDate(ctx, t, 4, false, start);
}
function readDate(ctx, str, type, unsafeDelim, errPtr, temporalSuffix) {
  if (ctx.ld) {
    let date = new TomlDate(str, type, unsafeDelim);
    if (!date.isValid())
      TomlError.x("invalid date", ctx, errPtr);
    return date;
  }
  try {
    if (temporalSuffix)
      str += temporalSuffix;
    switch (type) {
      case 1:
        return Temporal.ZonedDateTime.from(str);
      case 2:
        return Temporal.PlainDateTime.from(str);
      case 3:
        return Temporal.PlainDate.from(str);
      case 4:
        return Temporal.PlainTime.from(str);
    }
  } catch (e) {
    TomlError.x(e instanceof Error ? e.message : "" + e, ctx, errPtr);
  }
}

// node_modules/smol-toml/dist/util.js
function skipComment(ctx) {
  for (; ctx.p < ctx.s.length; ctx.p++) {
    let c = ctx.s.charCodeAt(ctx.p);
    if (c === 10)
      break;
    if (c === 13 && ctx.s.charCodeAt(ctx.p + 1) === 10) {
      ctx.p++;
      break;
    }
    if (c < 32 && c !== 9 || c === 127) {
      TomlError.x("control characters are not allowed in comments", ctx);
    }
  }
}
function skipVoid(ctx, banNewLines, banComments) {
  let c;
  while (ctx.p < ctx.s.length) {
    while (ctx.p < ctx.s.length && ((c = ctx.s.charCodeAt(ctx.p)) === 32 || c === 9 || !banNewLines && (c === 10 || c === 13 && ctx.s.charCodeAt(ctx.p + 1) === 10)))
      ctx.p++;
    if (banComments || c !== 35)
      break;
    skipComment(ctx);
  }
}

// node_modules/smol-toml/dist/struct.js
function parseKey(ctx, end = 61) {
  let startPtr;
  let state = 0;
  let parsed = [];
  let sliceStart;
  let c = ctx.s.charCodeAt(startPtr = ctx.p);
  do {
    if (c === end) {
      if (!state)
        TomlError.x("unexpected end of key", ctx);
      if (state === 1)
        parsed.push(ctx.s.slice(sliceStart, ctx.p));
      return ctx.p++, parsed;
    } else if (c === 46) {
      if (!state)
        TomlError.x("illegal empty bare key", ctx);
      if (state === 1)
        parsed.push(ctx.s.slice(sliceStart, ctx.p));
      state = 0;
    } else if (!state && (c === 34 || c === 39)) {
      if (c === ctx.s.charCodeAt(ctx.p + 1) && c === ctx.s.charCodeAt(ctx.p + 2))
        TomlError.x("illegal quoted key: multiline strings are not allowed", ctx);
      parsed.push(parseString(ctx));
      state = 2;
      ctx.p--;
    } else if (c === 32 || c === 9) {
      if (state === 1) {
        parsed.push(ctx.s.slice(sliceStart, ctx.p));
        state = 2;
      }
    } else if (state === 2 || c < 48 && c !== 45 || c > 57 && c < 65 || c > 90 && c < 97 && c !== 95 || c > 122) {
      TomlError.x("illegal character in key", ctx);
    } else if (!state) {
      state = 1;
      sliceStart = ctx.p;
    }
  } while (c = ctx.s.charCodeAt(++ctx.p));
  TomlError.x("incomplete key-value: cannot find end of key", ctx, startPtr);
}
function parseInlineTable(ctx) {
  let startPtr = ctx.p++;
  let res = /* @__PURE__ */ Object.create(null);
  let seen = /* @__PURE__ */ new Set();
  let c;
  while (ctx.p < ctx.s.length) {
    skipVoid(ctx);
    if ((c = ctx.s.charCodeAt(ctx.p)) === 125) {
      ctx.p++;
      return res;
    }
    let k;
    let t = res;
    let hasOwn = false;
    let errPtr = ctx.p;
    let key = parseKey(ctx);
    for (let i = 0; i < key.length; i++) {
      if (i)
        t = hasOwn ? t[k] : t[k] = /* @__PURE__ */ Object.create(null);
      k = key[i];
      if ((hasOwn = Object.hasOwn(t, k)) && (typeof t[k] !== "object" || seen.has(t[k]))) {
        TomlError.x("trying to redefine an already defined value", ctx, errPtr);
      }
      let unsafe = k === "__proto__";
      if (ctx.uk && (unsafe || k === "constructor")) {
        t = ctx.uk !== 1 && TomlError.x("document contains an unsafe property", ctx, errPtr);
        break;
      }
      if (!hasOwn && unsafe) {
        Object.defineProperty(t, k, { enumerable: true, configurable: true, writable: true });
      }
    }
    if (hasOwn) {
      TomlError.x("trying to redefine an already defined value", ctx, errPtr);
    }
    skipVoid(ctx, true, true);
    let value = extractValue(
      ctx,
      125
      /* } */
    );
    if (t && typeof (t[k] = value) === "object")
      seen.add(value);
    skipVoid(ctx);
    if ((c = ctx.s.charCodeAt(ctx.p++)) === 125) {
      return res;
    }
    if (c !== 44)
      TomlError.x("expected comma or end of structure", ctx, ctx.p - 1);
  }
  TomlError.x("unfinished table", ctx, startPtr);
}
function parseArray(ctx) {
  let startPtr = ctx.p++;
  let res = [];
  let c;
  while (ctx.p < ctx.s.length) {
    skipVoid(ctx);
    if ((c = ctx.s.charCodeAt(ctx.p)) === 93) {
      ctx.p++;
      return res;
    }
    res.push(extractValue(
      ctx,
      93
      /* ] */
    ));
    skipVoid(ctx);
    if ((c = ctx.s.charCodeAt(ctx.p++)) === 93) {
      return res;
    }
    if (c !== 44)
      TomlError.x("expected comma or end of structure", ctx, ctx.p - 1);
  }
  TomlError.x("unfinished array", ctx, startPtr);
}

// node_modules/smol-toml/dist/parse.js
function peekTable(ctx, key, table, meta, type) {
  let t = table;
  let m = meta;
  let k;
  let hasOwn = false;
  let state;
  for (let i = 0; i < key.length; i++) {
    if (i) {
      t = hasOwn ? t[k] : t[k] = /* @__PURE__ */ Object.create(null);
      m = (state = m[k]).c;
      if (type === 0 && (state.t === 1 || state.t === 2)) {
        return null;
      }
      if (state.t === 2) {
        let l = t.length - 1;
        t = t[l];
        m = m[l].c;
      }
    }
    k = key[i];
    if ((hasOwn = Object.hasOwn(t, k)) && m[k]?.t === 0 && m[k]?.d) {
      return null;
    }
    if (!hasOwn) {
      let unsafe = k === "__proto__";
      if (ctx.uk && (unsafe || k === "constructor"))
        return false;
      if (unsafe) {
        Object.defineProperty(t, k, { enumerable: true, configurable: true, writable: true });
        Object.defineProperty(m, k, { enumerable: true, configurable: true, writable: true });
      }
      m[k] = {
        t: i < key.length - 1 && type === 2 ? 3 : type,
        d: false,
        i: 0,
        c: /* @__PURE__ */ Object.create(null)
      };
    }
  }
  state = m[k];
  if (state.t !== type && !(type === 1 && state.t === 3)) {
    return null;
  }
  if (type === 2) {
    if (!state.d) {
      state.d = true;
      t[k] = [];
    }
    t[k].push(t = /* @__PURE__ */ Object.create(null));
    state.c[state.i++] = state = { t: 1, d: false, i: 0, c: /* @__PURE__ */ Object.create(null) };
  }
  if (state.d) {
    return null;
  }
  state.d = true;
  if (type === 1) {
    t = hasOwn ? t[k] : t[k] = /* @__PURE__ */ Object.create(null);
  } else if (type === 0 && hasOwn) {
    return null;
  }
  return [k, t, state.c];
}
function validateTablePeek(ctx, peek, ptr) {
  if (peek === null || ctx.uk === 2)
    TomlError.x(peek === null ? "trying to redefine an already defined table or value" : "document contains an unsafe property", ctx, ptr);
}
function parse(toml, options = {}) {
  let ctx = {
    s: toml,
    p: 0,
    d: options.maxDepth ?? 1e3,
    bi: options.integersAsBigInt ?? false,
    ld: options.useLegacyDate ?? true,
    uk: options.unsafeKeyBehaviour === "throw" ? 2 : options.unsafeKeyBehaviour === "drop" ? 1 : 0
  };
  let res = /* @__PURE__ */ Object.create(null);
  let meta = /* @__PURE__ */ Object.create(null);
  let tmp;
  let skipping = false;
  let tbl = res;
  let m = meta;
  if (toml.charCodeAt(0) === 65279)
    ctx.p++;
  skipVoid(ctx);
  while (ctx.p < toml.length) {
    if (toml.charCodeAt(ctx.p) === 91) {
      let isTableArray = toml.charCodeAt(++ctx.p) === 91;
      tmp = ctx.p += +isTableArray;
      skipping = false;
      let k = parseKey(
        ctx,
        93
        /* ] */
      );
      if (isTableArray) {
        if (toml.charCodeAt(ctx.p) !== 93) {
          TomlError.x("expected end of table array declaration", ctx);
        }
        ctx.p++;
      }
      let p = peekTable(
        ctx,
        k,
        res,
        meta,
        isTableArray ? 2 : 1
        /* Type.EXPLICIT */
      );
      if (!p) {
        validateTablePeek(ctx, p, tmp);
        skipping = true;
      } else {
        m = p[2];
        tbl = p[1];
      }
    } else {
      tmp = ctx.p;
      let k = parseKey(ctx);
      let p = peekTable(
        ctx,
        k,
        tbl,
        m,
        0
        /* Type.DOTTED */
      );
      if (!p && !skipping)
        validateTablePeek(ctx, p, tmp);
      skipVoid(ctx, true, true);
      let v = extractValue(ctx, void 0);
      if (p && !skipping)
        p[1][p[0]] = v;
    }
    skipVoid(ctx, true);
    if (ctx.p < toml.length && (tmp = toml.charCodeAt(ctx.p)) !== 10 && (tmp !== 13 || toml.charCodeAt(ctx.p + 1) !== 10)) {
      TomlError.x("each key-value declaration must be followed by an end-of-line", ctx);
    }
    skipVoid(ctx);
  }
  return res;
}

// node_modules/smol-toml/dist/stringify.js
var HAS_WELLFORMED = !!"".isWellFormed;

// src/native-pets.ts
var BUILTIN_PET_CATALOG = [
  { id: "codex", displayName: "Codex", source: "builtin" },
  { id: "dewey", displayName: "Dewey", source: "builtin" },
  { id: "fireball", displayName: "Fireball", source: "builtin" },
  { id: "hoots", displayName: "Hoots", source: "builtin" },
  { id: "rocky", displayName: "Rocky", source: "builtin" },
  { id: "seedy", displayName: "Seedy", source: "builtin" },
  { id: "stacky", displayName: "Stacky", source: "builtin" },
  { id: "bsod", displayName: "BSOD", source: "builtin" },
  { id: "null-signal", displayName: "Null Signal", source: "builtin" }
];
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function selection(value, source) {
  return { selectedPetId: value, genpetSelected: source === "unavailable" ? null : value === "custom:genpet-companion", source, liveVerified: false };
}
async function optionalText(file) {
  try {
    return await readFile6(file, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return void 0;
    throw error;
  }
}
async function readSelection(home, errors) {
  let config;
  try {
    config = await optionalText(path7.join(home, "config.toml"));
  } catch {
    errors.push("config.toml: \u65E0\u6CD5\u8BFB\u53D6\u9009\u62E9\u8BBE\u7F6E");
    return selection(null, "unavailable");
  }
  if (config !== void 0) {
    let parsed;
    try {
      parsed = parse(config, { integersAsBigInt: true });
    } catch {
      errors.push("config.toml: TOML \u683C\u5F0F\u65E0\u6548\uFF0C\u65E0\u6CD5\u786E\u5B9A\u9009\u62E9\u8BBE\u7F6E");
      return selection(null, "unavailable");
    }
    const desktop = parsed.desktop;
    if (desktop !== void 0 && !isRecord(desktop)) {
      errors.push("config.toml: desktop \u5FC5\u987B\u662F\u8868");
      return selection(null, "unavailable");
    }
    if (isRecord(desktop) && Object.hasOwn(desktop, "selected-avatar-id")) {
      const value = desktop["selected-avatar-id"];
      if (typeof value !== "string") {
        errors.push("config.toml: selected-avatar-id \u5FC5\u987B\u662F\u5B57\u7B26\u4E32");
        return selection(null, "unavailable");
      }
      return selection(value, "config");
    }
  }
  let legacy;
  try {
    legacy = await optionalText(path7.join(home, ".codex-global-state.json"));
  } catch {
    errors.push(".codex-global-state.json: \u65E0\u6CD5\u8BFB\u53D6\u65E7\u9009\u62E9\u8BBE\u7F6E");
    return selection(null, "unavailable");
  }
  if (legacy !== void 0) {
    try {
      const state = JSON.parse(legacy);
      if (!isRecord(state)) throw new Error("Invalid state");
      const atoms = state["electron-persisted-atom-state"];
      if (atoms !== void 0 && !isRecord(atoms)) throw new Error("Invalid atoms");
      if (isRecord(atoms) && Object.hasOwn(atoms, "selected-avatar-id")) {
        const value = atoms["selected-avatar-id"];
        if (value !== null && typeof value !== "string") throw new Error("Invalid selection");
        return selection(value, "legacy");
      }
    } catch {
      errors.push(".codex-global-state.json: \u65E7\u9009\u62E9\u8BBE\u7F6E\u683C\u5F0F\u65E0\u6548");
      return selection(null, "unavailable");
    }
  }
  return selection("codex", "default");
}
async function readNativePetSelection(home = process.env.CODEX_HOME || path7.join(homedir5(), ".codex")) {
  return readSelection(home, []);
}
async function localPets(home, errors) {
  const pets = /* @__PURE__ */ new Map();
  for (const [directory, filename] of [["avatars", "avatar.json"], ["pets", "pet.json"]]) {
    let entries;
    try {
      entries = await readdir3(path7.join(home, directory), { withFileTypes: true });
    } catch (error) {
      if (error.code !== "ENOENT") errors.push(`${directory}: \u65E0\u6CD5\u8BFB\u53D6\u5BA0\u7269\u76EE\u5F55`);
      continue;
    }
    for (const entry of entries) {
      if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
      const label = `${directory}/${entry.name}/${filename}`;
      try {
        const text = await optionalText(path7.join(home, directory, entry.name, filename));
        if (text === void 0) continue;
        const manifest = JSON.parse(text);
        if (!isRecord(manifest)) throw new Error("Invalid manifest");
        for (const key of ["id", "displayName"]) {
          if (manifest[key] !== void 0 && (typeof manifest[key] !== "string" || !manifest[key].trim())) throw new Error("Invalid name");
        }
        const id = `custom:${entry.name}`;
        const displayName = (manifest.displayName ?? manifest.id ?? entry.name).trim();
        pets.set(id, { id, displayName, source: "local" });
      } catch {
        errors.push(`${label}: \u65E0\u6CD5\u8BFB\u53D6\u6709\u6548\u5BA0\u7269\u6E05\u5355`);
      }
    }
  }
  return [...pets.values()].sort((a, b) => a.displayName.localeCompare(b.displayName));
}
async function getNativePetCatalog(home = process.env.CODEX_HOME || path7.join(homedir5(), ".codex")) {
  const errors = [];
  const selected = await readSelection(home, errors);
  const local = await localPets(home, errors);
  return {
    pets: [...BUILTIN_PET_CATALOG.map((pet) => ({ ...pet })), ...local],
    selection: selected,
    activation: { immediate: false, reason: "\u5F53\u524D\u4E3A\u78C1\u76D8\u5FEB\u7167\uFF1B\u5373\u65F6\u5207\u6362\u9700\u8981\u53EF\u7528\u7684 Codex app-tools \u4F1A\u8BDD\u901A\u9053\u3002" },
    ...errors.length ? { errors } : {}
  };
}

// src/native-pet-config.ts
import { randomUUID as randomUUID4 } from "node:crypto";
import { lstat as lstat2, mkdir as mkdir3, readFile as readFile7, rename as rename3, rm as rm2, writeFile as writeFile3 } from "node:fs/promises";
import { homedir as homedir6 } from "node:os";
import path8 from "node:path";
import { isDeepStrictEqual } from "node:util";
var field = "selected-avatar-id";
var unsupported = "Cannot safely edit desktop.selected-avatar-id in this TOML layout; config.toml was not changed.";
async function readOptional(file) {
  try {
    return await readFile7(file);
  } catch (error) {
    if (error.code === "ENOENT") return void 0;
    throw error;
  }
}
function patchSelection(text, before, petId) {
  const desktop = before.desktop;
  if (desktop !== void 0 && (desktop === null || typeof desktop !== "object" || Object.getPrototypeOf(desktop) !== null)) {
    throw new Error(unsupported);
  }
  const table = desktop;
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const value = JSON.stringify(petId);
  const headers = [...text.matchAll(/^[\t ]*\[[\t ]*desktop[\t ]*\][\t ]*(?:#[^\r\n]*)?(?:\r?\n|$)/gm)];
  let updated;
  if (headers.length === 0) {
    if (table !== void 0) throw new Error(unsupported);
    updated = `${text}${text && !text.endsWith("\n") ? eol : ""}${text ? eol : ""}[desktop]${eol}${field} = ${value}${eol}`;
  } else {
    if (headers.length !== 1 || table === void 0) throw new Error(unsupported);
    const header = headers[0];
    const start = header.index + header[0].length;
    const rest = text.slice(start);
    const nextHeader = /^[\t ]*\[/m.exec(rest);
    const end = start + (nextHeader?.index ?? rest.length);
    if (Object.hasOwn(table, field)) {
      const entries = [...text.slice(start, end).matchAll(/^([\t ]*(?:selected-avatar-id|"selected-avatar-id"|'selected-avatar-id')[\t ]*=[\t ]*)("(?:[^"\\\r\n]|\\.)*"|'[^'\r\n]*')([\t ]*(?:#[^\r\n]*)?)(\r?\n|$)/gm)];
      if (entries.length !== 1) throw new Error(unsupported);
      const entry = entries[0];
      const offset = start + entry.index;
      updated = text.slice(0, offset) + entry[1] + value + entry[3] + entry[4] + text.slice(offset + entry[0].length);
    } else {
      updated = text.slice(0, start) + (header[0].endsWith("\n") ? "" : eol) + `${field} = ${value}${eol}` + text.slice(start);
    }
  }
  const after = parse(updated, { integersAsBigInt: true });
  const expectedDesktop = table ?? /* @__PURE__ */ Object.create(null);
  expectedDesktop[field] = petId;
  before.desktop = expectedDesktop;
  if (!isDeepStrictEqual(before, after)) throw new Error(unsupported);
  return updated;
}
async function saveNativePetSelection(petId, home) {
  const codexHome = path8.resolve(home ?? process.env.CODEX_HOME ?? path8.join(homedir6(), ".codex"));
  const catalog = await getNativePetCatalog(codexHome);
  if (!catalog.pets.some((pet) => pet.id === petId)) throw new Error(`Unknown native pet ID: ${petId}`);
  const file = path8.join(codexHome, "config.toml");
  const original = await readOptional(file);
  let mode = 384;
  if (original !== void 0) {
    const info = await lstat2(file);
    if (!info.isFile() || info.isSymbolicLink()) throw new Error("Refusing to replace a non-regular config.toml.");
    mode = info.mode & 511;
  }
  const text = original?.toString("utf8") ?? "";
  if (original && !Buffer.from(text, "utf8").equals(original)) throw new Error("config.toml is not valid UTF-8; it was not changed.");
  const before = parse(text, { integersAsBigInt: true });
  const result = { selectedPetId: petId, restartRequired: true, immediate: false };
  if (before.desktop?.[field] === petId) return result;
  const updated = patchSelection(text, before, petId);
  await mkdir3(codexHome, { recursive: true });
  const temporary = path8.join(codexHome, `.config.toml.genpet-${randomUUID4()}.tmp`);
  const assertUnchanged = async () => {
    const current = await readOptional(file);
    if (original === void 0 ? current !== void 0 : current === void 0 || !original.equals(current)) {
      throw new Error("config.toml changed while saving the pet preference; retry after the other edit finishes.");
    }
  };
  try {
    await writeFile3(temporary, updated, { mode, flag: "wx" });
    await assertUnchanged();
    if (original !== void 0) {
      result.backupPath = `${file}.genpet-backup-${randomUUID4()}`;
      await writeFile3(result.backupPath, original, { mode, flag: "wx" });
    }
    await assertUnchanged();
    await rename3(temporary, file);
    return result;
  } finally {
    await rm2(temporary, { force: true });
  }
}

// src/native-pet-live.ts
import { randomUUID as randomUUID5 } from "node:crypto";
import net2 from "node:net";
var maxFrameBytes = 8 * 1024 * 1024;
var selectedKey = "selected-avatar-id";
function record(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function connection(options) {
  const pipePath = (Object.hasOwn(options, "pipePath") ? options.pipePath : process.env.CODEX_APP_TOOLS_PIPE_PATH)?.trim();
  const threadId = (Object.hasOwn(options, "threadId") ? options.threadId : process.env.CODEX_THREAD_ID)?.trim();
  if (!pipePath || !threadId) throw new Error("The current Codex app tools pipe and thread ID are unavailable.");
  if (process.platform === "win32" && !pipePath.startsWith("\\\\.\\pipe\\")) {
    throw new Error("Expected a local Windows named pipe for Codex app tools.");
  }
  const timeoutMs = options.timeoutMs ?? 5e3;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new Error("The Codex app tools timeout must be positive.");
  return { pipePath, threadId, timeoutMs };
}
function frame(message) {
  const payload = Buffer.from(JSON.stringify(message));
  const header = Buffer.alloc(4);
  header.writeUInt32LE(payload.length);
  return Buffer.concat([header, payload]);
}
function projectSelection(value) {
  if (!record(value) || !record(value.settings) || !record(value.effectiveSettings)) {
    throw new Error("Codex returned an invalid settings response.");
  }
  const selectedPetId = value.settings[selectedKey] ?? null;
  const effectiveSelectedPetId = value.effectiveSettings[selectedKey] ?? null;
  if (selectedPetId !== null && typeof selectedPetId !== "string" || effectiveSelectedPetId !== null && typeof effectiveSelectedPetId !== "string") {
    throw new Error("Codex returned an invalid pet selection.");
  }
  return { selectedPetId, effectiveSelectedPetId };
}
async function requestSelection(options, petId) {
  const { pipePath, threadId, timeoutMs } = connection(options);
  const id = 1;
  const request = {
    jsonrpc: "2.0",
    id,
    method: "tools/call",
    params: {
      namespace: "codex_app",
      tool: petId === void 0 ? "read_settings" : "write_settings",
      arguments: petId === void 0 ? { include_config: false } : { settings: { [selectedKey]: petId } },
      callerSource: "codex",
      threadId,
      callId: `mcp-call-${randomUUID5()}`,
      // These fallbacks follow the bundled app-tools MCP's request metadata.
      turnId: `mcp-turn-${randomUUID5()}`
    }
  };
  return new Promise((resolve, reject) => {
    const socket = net2.createConnection(pipePath);
    let pending = Buffer.alloc(0);
    let settled = false;
    let sent = false;
    const finish = (error, result, cancel = false) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (cancel && sent && !socket.destroyed) {
        socket.end(frame({ jsonrpc: "2.0", id, method: "tools/cancel" }));
        socket.destroySoon();
      } else socket.destroy();
      if (error) reject(error);
      else resolve(result);
    };
    const timer = setTimeout(() => finish(new Error("Codex app tools timed out; the current selection is unconfirmed."), void 0, true), timeoutMs);
    socket.once("connect", () => {
      sent = true;
      socket.write(frame(request));
    });
    socket.on("error", (error) => finish(new Error(`Codex app tools connection failed (${error.code ?? "socket error"}).`)));
    socket.on("close", () => finish(new Error("Codex app tools closed before confirming the pet selection.")));
    socket.on("data", (bytes) => {
      if (settled) return;
      pending = Buffer.concat([pending, bytes]);
      while (pending.length >= 4) {
        const length = pending.readUInt32LE(0);
        if (length > maxFrameBytes) return finish(new Error("Codex app tools response exceeded the size limit."));
        if (pending.length < length + 4) return;
        let response;
        try {
          response = JSON.parse(pending.subarray(4, length + 4).toString("utf8"));
        } catch {
          return finish(new Error("Codex app tools returned invalid JSON."));
        }
        pending = pending.subarray(length + 4);
        if (!record(response) || response.id !== id) continue;
        if (response.error !== void 0) return finish(new Error("Codex rejected the app tool request."));
        const result = response.result;
        if (!record(result) || result.success !== true || !Array.isArray(result.contentItems)) {
          return finish(new Error("Codex could not complete the pet settings request."));
        }
        const item = result.contentItems.find((item2) => record(item2) && item2.type === "inputText");
        if (!record(item) || typeof item.text !== "string") return finish(new Error("Codex returned no pet settings result."));
        try {
          finish(void 0, projectSelection(JSON.parse(item.text)));
        } catch {
          finish(new Error("Codex returned an invalid pet settings result."));
        }
      }
    });
  });
}
async function readNativePetLive(options = {}) {
  try {
    return { available: true, ...await requestSelection(options) };
  } catch (error) {
    return { available: false, reason: error instanceof Error ? error.message : "Live Codex pet selection is unavailable." };
  }
}
async function selectNativePetLive(petId, options = {}) {
  if (typeof petId !== "string" || petId.trim() !== petId || petId.length === 0 || petId.length > 512 || /[\x00-\x1f\x7f]/.test(petId)) {
    throw new Error("A valid pet ID is required.");
  }
  await requestSelection(options, petId);
  const result = await requestSelection(options);
  if (result.selectedPetId !== petId || result.effectiveSelectedPetId !== petId) {
    throw new Error("The live Codex selection did not match the requested pet; its current selection is unconfirmed.");
  }
  return { ...result, immediate: true, restartRequired: false, hostStateConfirmed: true, visualVerified: false };
}

// src/debugger-server.ts
var debuggerRoot = pluginRoot();
async function bundledAssets() {
  return { portraits: {} };
}
var SPRITE_NAME = /^spritesheet-[a-f0-9]{8,64}\.(webp|png)$/;
function nativePetDirectory() {
  return path9.join(process.env.CODEX_HOME || path9.join(homedir7(), ".codex"), "pets", "genpet-companion");
}
async function nativePetSelection() {
  return readNativePetSelection();
}
async function listNativeSprites() {
  const destination = nativePetDirectory();
  let current = null;
  try {
    current = JSON.parse(await readFile8(path9.join(destination, "pet.json"), "utf8")).spritesheetPath ?? null;
  } catch {
  }
  const sprites = (await listInstalledSprites(destination)).filter((name) => SPRITE_NAME.test(name)).sort();
  return { destination, current, sprites, live: isLiveNativeDestination(destination) };
}
async function runNativeIpc(mode) {
  if (mode === "probe") throw new Error("Use explicit refresh to request IPC refresh");
  if (!isLiveNativeDestination(nativePetDirectory())) throw new Error("Isolated destinations cannot refresh the host");
  return { ...await refreshViaIpc(), selection: await nativePetSelection() };
}
async function switchNativeSprite(name, method = "ipc", ipcRunner = runNativeIpc) {
  if (!["ipc", "file"].includes(method)) throw new Error("\u672A\u77E5\u5237\u65B0\u65B9\u5F0F");
  if (!SPRITE_NAME.test(name) || name !== path9.basename(name)) throw new Error("\u53EA\u80FD\u9009\u62E9\u5DF2\u5B89\u88C5\u7684\u56FE\u96C6\u6587\u4EF6");
  const destination = nativePetDirectory();
  const sprite = path9.join(destination, name);
  const root = await realpath(destination);
  const resolved = await realpath(sprite);
  if (resolved !== path9.join(root, name)) throw new Error("\u53EA\u80FD\u9009\u62E9\u5DF2\u5B89\u88C5\u7684\u56FE\u96C6\u6587\u4EF6");
  const manifestPath = path9.join(destination, "pet.json");
  const manifest = JSON.parse(await readFile8(manifestPath, "utf8"));
  const next = { ...manifest, spritesheetPath: name };
  await copyFile2(manifestPath, path9.join(destination, "previous-pet.json")).catch((error) => {
    if (error.code !== "ENOENT") throw error;
  });
  const temporary = path9.join(destination, `.pet-${randomUUID6()}.json`);
  await writeFile4(temporary, JSON.stringify(next, null, 2));
  await rename4(temporary, manifestPath);
  const live = isLiveNativeDestination(destination);
  if (method === "file") return { spritesheet: name, refresh: { displayStatus: "unconfirmed", strategy: "file-only", notice: "\u53EA\u66FF\u6362\u6587\u4EF6\uFF0C\u5C1A\u672A\u8BF7\u6C42\u5237\u65B0\u3002" } };
  if (method === "ipc") return { spritesheet: name, refresh: await ipcRunner("refresh") };
}
async function startServer(port = Number(process.env.GENPET_PORT || 47831), root, options = {}) {
  const real = new Store(root), demo = new Store(path9.join(real.root, "debugger"), true);
  const token = randomBytes(24).toString("hex");
  const livePets = options.livePets !== void 0 ? options.livePets : !options.nativeHome && isLiveNativeDestination(nativePetDirectory()) ? { read: readNativePetLive, select: selectNativePetLive } : null;
  async function petCatalog() {
    const catalog = await getNativePetCatalog(options.nativeHome);
    if (livePets) {
      const live = await livePets.read();
      if (live.available) {
        const selectedPetId = live.effectiveSelectedPetId ?? live.selectedPetId;
        catalog.selection = { selectedPetId, genpetSelected: selectedPetId === "custom:genpet-companion", source: "app-tools", liveVerified: true };
        catalog.activation = { immediate: true, reason: "\u5DF2\u8FDE\u63A5\u5BBF\u4E3B\u8BBE\u7F6E\u901A\u9053\uFF0C\u53EF\u7ACB\u5373\u66F4\u6362\u5F53\u524D\u5BA0\u7269\u3002" };
      } else catalog.activation = { immediate: false, reason: "\u5BBF\u4E3B\u8BBE\u7F6E\u901A\u9053\u6682\u4E0D\u53EF\u7528\uFF1B\u53EF\u4FDD\u5B58\u9009\u62E9\u4F9B\u4E0B\u6B21\u542F\u52A8\u4F7F\u7528\u3002" };
    }
    return catalog;
  }
  const server = http.createServer(async (req, res) => {
    const json = (value, status = 200) => {
      res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
      res.end(JSON.stringify(value));
    };
    try {
      const host = req.headers.host || "";
      if (!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host)) return json({ error: "Local access only" }, 403);
      if (req.headers.origin && req.headers.origin !== `http://${host}`) return json({ error: "Origin rejected" }, 403);
      const url = new URL(req.url || "/", "http://" + host);
      const store = url.searchParams.get("demo") === "1" ? demo : real;
      if (req.method === "GET" && url.pathname === "/api/health") return json({ service: "genpet-debugger", root: real.root });
      if (req.method === "GET" && url.pathname === "/favicon.ico") {
        res.writeHead(204);
        res.end();
        return;
      }
      if (req.method === "GET" && url.pathname === "/api/state") {
        const state = await store.peek();
        const nativePets = store.demo ? null : await petCatalog();
        return json({ state, now: store.now(state), demo: store.demo, token, artRequest: artRequest(state), assets: await bundledAssets(), actions, nativeSprites: store.demo ? null : await listNativeSprites(), nativeSelection: nativePets?.selection ?? null, nativePets });
      }
      if (req.method === "GET" && url.pathname === "/api/art-request") return json(artRequest(await store.peek()));
      if (req.method === "POST" && url.pathname === "/api/action") {
        const origin = req.headers.origin;
        if (origin && origin !== `http://${host}`) return json({ error: "Origin rejected" }, 403);
        if (req.headers["x-genpet-token"] !== token) return json({ error: "Invalid request token" }, 403);
        let body = "";
        for await (const chunk of req) {
          body += chunk;
          if (body.length > 16384) throw new Error("Request too large");
        }
        const input = JSON.parse(body);
        let result;
        if (input.action === "stop") {
          json({ ok: true, result: { stopped: true } });
          server.close();
          server.closeIdleConnections();
          return;
        }
        if (input.action === "export") {
          if (store.demo) throw new Error("\u6F14\u793A\u6A21\u5F0F\u4E0D\u80FD\u5B89\u88C5\u771F\u5B9E\u539F\u751F\u5BA0\u7269");
          result = await installNative(store);
        } else if (input.action === "ipc-probe" || input.action === "ipc-refresh") {
          if (store.demo) throw new Error("\u6F14\u793A\u6A21\u5F0F\u4E0D\u80FD\u64CD\u4F5C\u771F\u5B9E\u5BBF\u4E3B IPC");
          result = await (options.ipcRunner || runNativeIpc)(input.action === "ipc-probe" ? "probe" : "refresh");
        } else if (input.action === "switch-native") {
          if (store.demo) throw new Error("\u6F14\u793A\u6A21\u5F0F\u4E0D\u80FD\u5207\u6362\u771F\u5B9E\u60AC\u6D6E\u5BA0\u7269");
          result = await switchNativeSprite(String(input.spritesheet || ""), String(input.refreshMethod || "ipc"), options.ipcRunner || runNativeIpc);
        } else if (input.action === "select-native-pet") {
          if (store.demo) throw new Error("\u6F14\u793A\u6A21\u5F0F\u4E0D\u80FD\u66F4\u6539 Codex \u7684\u5BA0\u7269\u9009\u62E9");
          const petId = String(input.petId || "");
          if (input.applyMode === "live") {
            if (!livePets) throw new Error("\u5373\u65F6\u5207\u6362\u901A\u9053\u4E0D\u53EF\u7528\uFF0C\u8BF7\u4ECE\u5F53\u524D Codex \u4F1A\u8BDD\u91CD\u65B0\u6253\u5F00 debugger\u3002");
            if (!(await getNativePetCatalog(options.nativeHome)).pets.some((pet) => pet.id === petId)) throw new Error("\u672A\u77E5\u5BA0\u7269\uFF0C\u672A\u66F4\u6539\u9009\u62E9\u3002");
            result = await livePets.select(petId);
          } else if (input.applyMode === void 0 || input.applyMode === "save") result = await saveNativePetSelection(petId, options.nativeHome);
          else throw new Error("\u672A\u77E5\u5BA0\u7269\u5207\u6362\u65B9\u5F0F");
        } else result = await store.transaction(async (s) => {
          if (input.action === "adopt") return store.adopt(s, input.profile || {});
          if (input.action === "settings") {
            return configureState(s, input);
          }
          if (input.action === "clear-context") {
            if (s.pet) for (const c of [...s.pet.context]) s.pet = removeContext(s.pet, c.id, store.now(s));
            return { cleared: true };
          }
          if (input.action === "scan") {
            await store.sync(s, true);
            return s.scanInfo;
          }
          if (!s.pet) throw new Error("Adopt a pet first");
          if (input.action === "profile") {
            s.pet = updateProfile(s.pet, input.profile);
            return s.pet;
          }
          if (input.action === "context") {
            s.pet = addContext(s.pet, { kind: input.kind, summary: input.summary || "", source: "user", milestone: input.milestone === true }, store.now(s));
            return s.pet;
          }
          if (input.action === "advance") {
            if (!store.demo) throw new Error("Time travel is available only in the demo");
            if (typeof input.hours !== "number" || !Number.isFinite(input.hours) || input.hours <= 0 || input.hours > 24 * 90) throw new Error("Invalid demo time jump");
            s.clockOffset += input.hours * HOUR;
            s.pet = evolvePet(s.pet, store.now(s));
            return s.pet;
          }
          if (input.action === "reset-demo") {
            if (!store.demo) throw new Error("Only demo data can be reset");
            s.clockOffset = 0;
            s.pet = createPet({ ...DEFAULT_PROFILE, name: "GenPet Demo" }, Date.now(), "genpet-demo-egg");
            s.art = [];
            return s.pet;
          }
          throw new Error("Unknown action");
        });
        return json({ ok: true, result });
      }
      if (req.method === "GET" && url.pathname.startsWith("/art/")) {
        const state = await store.peek();
        const record2 = state.art.find((a) => `${a.id}-${a.kind}` === url.pathname.slice(5));
        if (!record2) return json({ error: "Art not found" }, 404);
        res.writeHead(200, { "Content-Type": record2.file.endsWith(".webp") ? "image/webp" : "image/png", "Cache-Control": "private, max-age=3600" });
        res.end(await readFile8(record2.file));
        return;
      }
      if (req.method !== "GET") return json({ error: "Not found" }, 404);
      let file;
      {
        const routes = { "/": "index.html", "/app.js": "app.js", "/style.css": "style.css" };
        if (!routes[url.pathname]) return json({ error: "Not found" }, 404);
        file = path9.join(debuggerRoot, "debugger-web", routes[url.pathname]);
      }
      const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".png": "image/png", ".webp": "image/webp", ".json": "application/json", ".svg": "image/svg+xml" };
      res.writeHead(200, { "Content-Type": types[path9.extname(file)] || "application/octet-stream", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'" });
      res.end(await readFile8(file));
    } catch (e) {
      if (!res.headersSent) json({ error: e.message }, e.code === "ENOENT" ? 404 : 400);
      else res.end();
    }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });
  return server;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = await startServer();
  console.log(`GenPet debugger is ready at http://127.0.0.1:${server.address().port}`);
  for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.close(() => process.exit(0)));
}
export {
  listNativeSprites,
  nativePetSelection,
  runNativeIpc,
  startServer,
  switchNativeSprite
};
/*! Bundled license information:

smol-toml/dist/error.js:
smol-toml/dist/primitive.js:
smol-toml/dist/date.js:
smol-toml/dist/extract.js:
smol-toml/dist/util.js:
smol-toml/dist/struct.js:
smol-toml/dist/parse.js:
smol-toml/dist/stringify.js:
smol-toml/dist/index.js:
  (*!
   * Copyright (c) Squirrel Chat et al., All rights reserved.
   * SPDX-License-Identifier: BSD-3-Clause
   *
   * Redistribution and use in source and binary forms, with or without
   * modification, are permitted provided that the following conditions are met:
   *
   * 1. Redistributions of source code must retain the above copyright notice, this
   *    list of conditions and the following disclaimer.
   * 2. Redistributions in binary form must reproduce the above copyright notice,
   *    this list of conditions and the following disclaimer in the
   *    documentation and/or other materials provided with the distribution.
   * 3. Neither the name of the copyright holder nor the names of its contributors
   *    may be used to endorse or promote products derived from this software without
   *    specific prior written permission.
   *
   * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
   * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
   * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
   * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
   * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
   * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
   * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
   * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
   * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
   * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
   *)
*/
