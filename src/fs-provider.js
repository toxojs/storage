const { BaseProvider } = require('@toxo/database');
const fs = require('fs');
const path = require('path');

class FsProvider extends BaseProvider {
  constructor(settings = {}) {
    super(settings);
    this.basePath = this.settings.folder || './';
    this.isJson = this.settings.isJson || false;
    this.options = this.settings.options;
    if (!this.options && this.isJson) {
      this.options = { encoding: 'utf8' };
    }
    this.started = false;
  }

  get isStarted() {
    return this.started;
  }

  getFilePath(name, fileName) {
    return fileName
      ? path.join(this.basePath, name, fileName)
      : path.join(this.basePath, name);
  }

  static createFolder(name) {
    if (!fs.existsSync(name)) {
      return fs.promises.mkdir(name, { recursive: true });
    }
    return true;
  }

  async findById(name, id) {
    const filePath = this.getFilePath(name, id);
    if (!fs.existsSync(filePath)) {
      return undefined;
    }
    const file = await fs.promises.readFile(filePath, this.options);
    const content = this.isJson ? JSON.parse(file) : file;
    return { id, data: content };
  }

  existsById(name, id) {
    const filePath = this.getFilePath(name, id);
    return fs.existsSync(filePath);
  }

  async insertOne(name, item) {
    const fileDir = this.getFilePath(name);
    await FsProvider.createFolder(fileDir);
    const fileName = item.fileName || item.id;
    const filePath = this.getFilePath(name, fileName);
    const data = this.isJson ? JSON.stringify(item.data) : item.data;
    if (fs.existsSync(filePath)) {
      throw new Error(`File ${filePath} already exists`);
    }
    return fs.promises.writeFile(filePath, data, this.options);
  }

  async insertMany(name, items) {
    for (let i = 0; i < items.length; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await this.insertOne(name, items[i]);
    }
  }

  async update(name, item) {
    if (!this.isJson) {
      return this.replace(name, item);
    }
    const fileName = item.fileName || item.id;
    const filePath = this.getFilePath(name, fileName);
    if (!fs.existsSync(filePath)) {
      throw new Error(`File ${filePath} does not exists`);
    }
    const file = await fs.promises.readFile(filePath, this.options);
    const content = this.isJson ? JSON.parse(file) : file;
    const merged = { ...content, ...item.data };
    const data = JSON.stringify(merged);
    await fs.promises.writeFile(filePath, data, this.options);
    return { id: fileName, data: merged };
  }

  async replace(name, item) {
    const fileNName = item.fileName || item.id;
    const filePath = this.getFilePath(name, fileNName);
    if (!fs.existsSync(filePath)) {
      throw new Error(`File ${filePath} does not exists`);
    }
    const data = this.isJson ? JSON.stringify(item.data) : item.data;
    await fs.promises.writeFile(filePath, data, this.options);
    return { id: fileNName, data: item.data };
  }

  async save(name, item) {
    const exists = await this.existsById(name, item.fileName || item.id);
    return exists ? this.update(name, item) : this.insertOne(name, item);
  }

  removeById(name, id) {
    const filePath = this.getFilePath(name, id);
    if (fs.existsSync(filePath)) {
      fs.rmSync(filePath);
      return 1;
    }
    return 0;
  }

  drop(name) {
    const fileDir = this.getFilePath(name);
    fs.rmSync(fileDir, { recursive: true, force: true });
  }

  start() {
    this.started = true;
  }

  stop() {
    this.started = false;
  }
}

module.exports = {
  FsProvider,
};
