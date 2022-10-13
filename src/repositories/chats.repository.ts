import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {DbDataSource} from '../datasources';
import {Chats, ChatsRelations} from '../models';

export class ChatsRepository extends DefaultCrudRepository<
  Chats,
  typeof Chats.prototype.id,
  ChatsRelations
> {
  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
  ) {
    super(Chats, dataSource);
  }
}
