export const userOrg = async (id: string, dbInstance: any) => {
  // Using the db instance passed or imported
  const findUser = await dbInstance.query.users.findFirst({
    where: (user: any, { eq }: any) => eq(user.id, id),
    with: {
      entity: {
        with: {},
      },
    },
  });
  console.log(findUser);
  return findUser?.entity?.id;
};
