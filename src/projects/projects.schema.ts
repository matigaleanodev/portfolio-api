import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ProjectDocument = HydratedDocument<Project>;

@Schema({ collection: 'projects' })
export class Project {
  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  image!: string;

  @Prop({ required: true })
  description!: string;

  @Prop({
    type: [
      {
        id: { type: String, required: true },
        name: { type: String, required: true },
        icon: { type: String, required: true },
        color: { type: String, required: true },
        url: { type: String, required: true },
      },
    ],
    required: true,
  })
  links!: ProjectLink[];

  @Prop({ type: [String] })
  technologies?: string[];

  @Prop({ default: false })
  highlight?: boolean;

  @Prop()
  order?: number;
}

export class ProjectLink {
  id!: string;
  name!: string;
  icon!: string;
  color!: string;
  url!: string;
}

export const ProjectSchema = SchemaFactory.createForClass(Project);
