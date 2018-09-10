
export interface QueryPromise<RowType> {
  (queryString: string, params?: any[]): Promise<QueryResult<RowType>>;
}

export interface QueryResult<RowType> {
  rows: RowType[];
}

export interface TableRow {
  id: number;
}

export type SqlCrud<TableRow> = {
  [Prop in keyof TableRow]: {
    insert(thing: { [P1 in keyof TableRow[Prop]]?: TableRow[Prop][P1] }): Promise<QueryResult<any>>;
    update(
      idProps: string[], 
      idVals: Array<number | string>, 
      obj: { [P1 in keyof TableRow[Prop]]?: TableRow[Prop][P1] }
    ): Promise<QueryResult<any>>;
    delete(
      idProps: string[], idVals: Array<number | string>
    ): Promise<QueryResult<any>>;
    select(): Promise<TableRow[Prop][]>;
    selectWhere(
      idProps: string[], idVals: Array<number | string>
    ): Promise<TableRow[Prop][]>;
  };
};
