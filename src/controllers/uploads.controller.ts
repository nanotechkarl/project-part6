import {authenticate} from '@loopback/authentication';
import {inject} from '@loopback/core';
import {repository} from '@loopback/repository';
import {
  del,
  get,
  getModelSchemaRef,
  HttpErrors,
  oas,
  param,
  post,
  put,
  Request,
  requestBody,
  response,
  Response,
  RestBindings,
} from '@loopback/rest';
import {SecurityBindings, securityId, UserProfile} from '@loopback/security';
import fs from 'fs';
import path from 'path';
import {promisify} from 'util';
import {FILE_UPLOAD_SERVICE, STORAGE_DIRECTORY} from '../keys';
import {Uploads} from '../models';
import {UploadsRepository, UsersRepository} from '../repositories';
import {FileUploadHandler} from '../types';

const readdir = promisify(fs.readdir);

/* #region  - Request/response schema */
const responseSchema = {
  getAll: {
    description: 'Get all files',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: getModelSchemaRef(Uploads, {includeRelations: true}),
        },
      },
    },
  },
  getById: {
    description: 'Get Files by user ID',
    content: {
      'application/json': {
        schema: {
          type: 'array',
        },
      },
    },
  },
  getSharedUsers: {
    description: 'Get shared users of the file',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: getModelSchemaRef(Uploads, {
            includeRelations: true,
            exclude: ['id', 'fileId', 'label', 'sharedTo', 'file'],
          }),
        },
      },
    },
  },
  getSharedList: {
    description: 'Get shared uploads for the current user',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: getModelSchemaRef(Uploads, {
            includeRelations: true,
            exclude: ['id'],
          }),
        },
      },
    },
  },
  saveDescription: {
    description: 'Save file description',
    content: {
      'application/json': {
        schema: getModelSchemaRef(Uploads, {exclude: ['id']}),
      },
    },
  },
  updateDescription: {
    description: 'Update file description',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            count: {type: 'number'},
          },
        },
      },
    },
  },
  deleteFile: {
    description: 'Delete single file',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            count: {type: 'number'},
          },
        },
      },
    },
  },
  deleteAll: {
    description: 'Delete all files by user',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            count: {type: 'number'},
          },
        },
      },
    },
  },
  shareFileTo: {
    description: 'Add user to SharedTo of file',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            userId: {type: 'number'},
          },
        },
      },
    },
  },
  fileUpload: {
    description: 'Files and fields',
    content: {
      'application/json': {
        schema: {
          type: 'object',
        },
      },
    },
  },
  listFiles: {
    description: 'A list of files',
    content: {
      // string[]
      'application/json': {
        schema: {
          type: 'array',
          items: {
            type: 'string',
          },
        },
      },
    },
  },
};

const requestBodySchema = {
  saveDescription: {
    content: {
      'application/json': {
        schema: getModelSchemaRef(Uploads, {
          title: 'NewUploads',
          exclude: ['id', 'userId', 'sharedTo'],
        }),
      },
    },
  },
  updateDescription: {
    content: {
      'application/json': {
        schema: getModelSchemaRef(Uploads, {
          title: 'UpdateFile',
          exclude: ['id', 'userId', 'sharedTo', 'file', 'fileId'],
        }),
      },
    },
  },
  shareFileto: {
    content: {
      'application/json': {
        schema: getModelSchemaRef(Uploads, {
          exclude: ['id', 'file', 'fileId', 'label', 'sharedTo'],
        }),
      },
    },
  },
};
/* #endregion */

@authenticate('jwt')
export class UploadsController {
  /* #region - Constructor */
  constructor(
    @inject(SecurityBindings.USER, {optional: true})
    public user: UserProfile,
    @repository(UploadsRepository)
    public uploadsRepository: UploadsRepository,
    @repository(UsersRepository)
    protected usersRepository: UsersRepository,
    @inject(FILE_UPLOAD_SERVICE) private handler: FileUploadHandler,
    @inject(STORAGE_DIRECTORY) private storageDirectory: string,
  ) {}
  /* #endregion */

  /* #region - Get All files */
  @get('/uploads')
  @response(200, responseSchema.getAll)
  async find(): Promise<Uploads[]> {
    const found = await this.usersRepository.find({
      where: {id: parseInt(this.user[securityId])},
    });
    if (!found.length) throw new Error('User does not exist');

    return this.uploadsRepository.find();
  }
  /* #endregion */

  /* #region - Get files by user ID */
  @get('/uploads/{userId}')
  @response(200, responseSchema.getById)
  async findById(
    @param.path.number('userId') userId: number,
  ): Promise<Uploads[]> {
    return this.uploadsRepository.find({where: {userId}, fields: {id: false}});
  }
  /* #endregion */

  /* #region - Get shared users of the file */
  @get('/uploads/shared/{fileId}')
  @response(200, responseSchema.getSharedUsers)
  async getSharedUsers(@param.path.string('fileId') fileId: string) {
    if (!this.user[securityId]) throw new Error('User not found');

    const userId: number = parseInt(this.user[securityId]);
    const result = await this.uploadsRepository.findOne({
      where: {userId, fileId},
    });

    return result?.sharedTo;
  }
  /* #endregion */

  /* #region - Save file description */
  @post('/uploads')
  @response(200, responseSchema.saveDescription)
  async create(
    @requestBody(requestBodySchema.saveDescription)
    uploads: Omit<Uploads, 'id'>,
  ): Promise<Uploads> {
    const {fileId} = uploads;
    const userId = parseInt(this.user[securityId]);

    const found = await this.usersRepository.find({where: {id: userId}});
    if (!found.length) throw new Error('User does not exist');
    if (!fileId)
      throw new Error('Upload validation failed: key: Key is required.');

    uploads.userId = userId;
    uploads.fileId = `FILE_${fileId}`;
    uploads.sharedTo = [];

    return this.uploadsRepository.create(uploads);
  }
  /* #endregion */

  /* #region - Update file description */
  @put('/uploads/{fileId}')
  @response(204, responseSchema.updateDescription)
  async replaceById(
    @param.path.string('fileId') fileId: string,
    @requestBody(requestBodySchema.updateDescription) uploads: Uploads,
  ): Promise<Object> {
    const updatedCount = await this.uploadsRepository.updateAll(uploads, {
      fileId,
    });

    return updatedCount;
  }
  /* #endregion */

  /* #region  - Add user to sharedTo of file */
  @put('/uploads/{fileId}/share')
  @response(204, responseSchema.shareFileTo)
  async shareFileTo(
    @param.path.string('fileId') fileId: string,
    @requestBody(requestBodySchema.shareFileto) uploads: Uploads,
  ): Promise<Object> {
    const sharedToObject = uploads;
    const userId: number = parseInt(this.user[securityId]);

    if (!sharedToObject || !sharedToObject.userId)
      throw new Error('No user to add');
    if (userId === sharedToObject.userId)
      throw new Error('Self sharing not allowed');

    const found = await this.uploadsRepository.findOne({
      where: {userId, fileId},
    });

    if (found) {
      found?.sharedTo?.push(sharedToObject);

      //Remove duplicate user ID's
      const unique = found?.sharedTo?.filter((value, index) => {
        const val = JSON.stringify(value);
        return (
          index ===
          found?.sharedTo?.findIndex(obj => {
            return JSON.stringify(obj) === val;
          })
        );
      });

      found.sharedTo = unique;
      await this.uploadsRepository.updateAll(found, {userId, fileId});

      return sharedToObject;
    } else {
      return {error: 'No file updated'};
    }
  }
  /* #endregion */

  /* #region - Delete single file by file ID */
  @del('/uploads/{fileId}')
  @response(204, responseSchema.deleteFile)
  async deleteById(
    @param.path.string('fileId') fileId: string,
  ): Promise<Object> {
    return this.uploadsRepository.deleteAll({fileId});
  }
  /* #endregion */

  /* #region - Delete All files of user */
  @del('/uploads/{userId}')
  @response(204, responseSchema.deleteAll)
  async deleteAll(
    @param.path.number('userId') userId: number,
  ): Promise<Object> {
    return this.uploadsRepository.deleteAll({userId});
  }
  /* #endregion */

  /* #region - Get shared uploads of current user  */
  @get('/uploads/shared')
  @response(200, responseSchema.getSharedList)
  async getSharedList() {
    const userId: number = parseInt(this.user[securityId]);
    const found = await this.usersRepository.find({where: {id: userId}});
    if (!found.length) throw new Error('User does not exist');

    const result = await this.uploadsRepository.find({fields: {id: false}});
    return result
      .map(obj => {
        const filter = obj.sharedTo?.find(data => {
          return data.userId === userId;
        });

        if (filter) {
          return obj;
        }
      })
      .filter(obj => obj !== undefined);
  }
  /* #endregion */

  /* #region - Delete specific user from sharedTo of the files */
  @del('/uploads/shared/{userId}')
  async deleteUserAllSharedTo(@param.path.number('userId') userId: number) {
    const hello = await this.uploadsRepository.find({
      where: {}, //TODO
    });
    console.log('hello :', hello);
  }
  /* #endregion */

  /* #region - File Upload */
  @post('/files')
  @response(200, responseSchema.fileUpload)
  async fileUpload(
    @requestBody.file()
    request: Request,
    @inject(RestBindings.Http.RESPONSE) res: Response,
  ): Promise<object> {
    return new Promise<object>((resolve, reject) => {
      this.handler(request, res, (err: unknown) => {
        if (err) reject(err);
        else {
          resolve(UploadsController.getFilesAndFields(request));
        }
      });
    });
  }

  private static getFilesAndFields(request: Request) {
    const uploadedFiles = request.files;
    const mapper = (f: globalThis.Express.Multer.File) => ({
      fieldname: f.fieldname,
      originalname: f.originalname,
      encoding: f.encoding,
      mimetype: f.mimetype,
      size: f.size,
    });
    let files: object[] = [];
    if (Array.isArray(uploadedFiles)) {
      files = uploadedFiles.map(mapper);
    } else {
      for (const filename in uploadedFiles) {
        files.push(...uploadedFiles[filename].map(mapper));
      }
    }
    return {files, fields: request.body};
  }
  /* #endregion */

  /* #region - File Download */
  @get('/files')
  @response(200, responseSchema.listFiles)
  async listFiles() {
    const files = await readdir(this.storageDirectory);
    return files;
  }

  @get('/files/{filename}')
  @oas.response.file()
  downloadFile(
    @param.path.string('filename') fileName: string,
    @inject(RestBindings.Http.RESPONSE) res: Response,
  ) {
    const file = this.validateFileName(fileName);
    res.download(file, fileName);
    return res;
  }

  /**
   * Validate file names to prevent them goes beyond the designated directory
   * @param fileName - File name
   */
  private validateFileName(fileName: string) {
    const resolved = path.resolve(this.storageDirectory, fileName);
    if (resolved.startsWith(this.storageDirectory)) return resolved;
    // The resolved file is outside sandbox
    throw new HttpErrors.BadRequest(`Invalid file name: ${fileName}`);
  }
  /* #endregion */
}
