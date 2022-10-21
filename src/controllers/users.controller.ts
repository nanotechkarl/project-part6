import {authenticate, TokenService} from '@loopback/authentication';
import {
  MyUserService,
  TokenServiceBindings,
  UserServiceBindings,
} from '@loopback/authentication-jwt';
import {inject} from '@loopback/core';
import {repository} from '@loopback/repository';
import {
  del,
  get,
  getModelSchemaRef,
  param,
  post,
  put,
  Request,
  requestBody,
  response,
  RestBindings,
} from '@loopback/rest';
import {SecurityBindings, securityId, UserProfile} from '@loopback/security';
import {Users} from '../models';
import {UsersRepository} from '../repositories';
const bcrypt = require('bcrypt'); //TODO

@authenticate('jwt')
export class UsersController {
  constructor(
    @inject(TokenServiceBindings.TOKEN_SERVICE)
    public jwtService: TokenService,
    @inject(UserServiceBindings.USER_SERVICE)
    public userService: MyUserService,
    @inject(SecurityBindings.USER, {optional: true})
    public user: UserProfile,
    @repository(UsersRepository)
    protected usersRepository: UsersRepository,
    @inject(RestBindings.Http.REQUEST) private request: Request,
  ) {}

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

  /* #region  - Get user by ID */
  @get('/users/property/{id}')
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

  /* #region  - Get User logged in properties */
  @get('/users/property')
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
  async whoAmI(): Promise<Users> {
    return this.usersRepository.findById(parseInt(this.user[securityId]), {
      fields: {password: false},
    });
  }
  /* #endregion */

  /* #region  - Update user details */
  @put('/users/{id}')
  @response(204, {
    description: 'Update user details',
    content: {
      'application/json': {
        schema: getModelSchemaRef(Users, {
          exclude: ['id', 'password'], //REVIEW schema exclusion
        }),
      },
    },
  })
  async replaceById(
    @param.path.number('id') id: number,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Users, {
            exclude: ['id', 'password'], //REVIEW schema exclusion
          }),
        },
      },
    })
    users: Users,
  ): Promise<void> {
    await this.usersRepository.updateById(id, users);
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

  /* #region  - Register */
  @authenticate.skip()
  @post('/users/register')
  @response(200, {
    description: 'Register',
    content: {
      'application/json': {
        schema: getModelSchemaRef(Users, {
          exclude: ['id'], //REVIEW schema exclusion
        }),
      },
    },
  })
  async create(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Users, {
            exclude: ['id'], //REVIEW schema exclusion
          }),
        },
      },
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

  /* #region  - Login */
  @authenticate.skip()
  @post('/users/login')
  @response(200, {
    description: 'Token',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            token: {
              type: 'string',
            },
          },
        },
      },
    },
  })
  async login(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Users, {
            exclude: ['id', 'fullName'], //REVIEW schema exclusion
          }),
        },
      },
    })
    users: Users,
  ): Promise<{token: string}> {
    const {email, password} = users;
    const existingUser = await this.usersRepository.findOne({where: {email}});
    if (!existingUser) throw new Error('User does not exist in the database');

    const validPassword = await bcrypt.compare(
      password,
      existingUser?.password,
    );
    if (!validPassword) throw new Error('Wrong password');

    const secId = existingUser?.id?.toString();
    const user1: UserProfile = {
      [securityId]: secId ?? '',
      email: existingUser.email,
      password: existingUser.password,
      id: existingUser.id,
    };

    const token = await this.jwtService.generateToken(user1);
    return {token};
  }
  /* #endregion */
}
