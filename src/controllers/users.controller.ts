import {repository} from '@loopback/repository';
import {
  del,
  get,
  getModelSchemaRef,
  param,
  post,
  put,
  requestBody,
  response,
} from '@loopback/rest';
import {Users} from '../models';
import {UsersRepository} from '../repositories';
const bcrypt = require('bcrypt');

const content = {
  'application/json': {
    schema: getModelSchemaRef(Users, {
      exclude: ['id'], //REVIEW schema exclusion
    }),
  },
};

export class UsersController {
  constructor(
    @repository(UsersRepository)
    public usersRepository: UsersRepository,
  ) {}

  //DONE
  /* #region  - Get all users */
  @get('/users')
  @response(200, {
    description: 'Array of Users model instances',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: getModelSchemaRef(Users, {
            includeRelations: true,
          }),
        },
      },
    },
  })
  async find(): Promise<Users[]> {
    return this.usersRepository.find({fields: {password: false}});
  }
  /* #endregion */

  //DONE
  /* #region  - Get user by ID */
  @get('/users/{id}')
  @response(200, {
    description: 'Users model instance',
    content: {
      'application/json': {
        schema: getModelSchemaRef(Users, {
          includeRelations: true,
          exclude: ['password'],
        }),
      },
    },
  })
  async findById(@param.path.number('id') id: number): Promise<Users> {
    return this.usersRepository.findById(id, {
      fields: {password: false},
    });
  }
  /* #endregion */

  /* #region  - Update user details */
  @put('/users/{id}')
  @response(204, {
    description: 'Update user details',
    content,
  })
  async replaceById(
    @param.path.number('id') id: number,
    @requestBody({
      content,
    })
    users: Users,
  ): Promise<void> {
    await this.usersRepository.replaceById(id, users);
  }
  /* #endregion */

  /* #region  - Delete user */
  @del('/users/{id}')
  @response(204, {
    description: 'Users DELETE success',
  })
  async deleteById(@param.path.number('id') id: number): Promise<void> {
    await this.usersRepository.deleteById(id);
  }
  /* #endregion */

  //DONE
  /* #region  - Register */
  @post('/users')
  @response(200, {
    description: 'Register',
    content,
  })
  async create(
    @requestBody({
      content,
    })
    users: Users,
  ): Promise<Users> {
    const {email, password} = users;
    //REVIEW Sample use of data querying
    const found = await this.usersRepository.find({where: {email}});

    if (found.length) throw new Error('User already exist'); //TODO throw better error

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    users.password = hashedPassword;
    users.id = new Date().getTime();

    return this.usersRepository.create(users);
  }
  /* #endregion */

  //login

  //property of logged in
}
