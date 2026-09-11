import { useState } from 'react';
import { Button, Card, Form, Input, Modal, Select, Space, Switch, Table, Tag, message, Popconfirm } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { HttpUtil } from '@/utils';

type AdminUser = { id:number; username:string; role:string; enabled:boolean; displayName:string; inboundIds:string };

const ROLE_OPTS = [
  {value:'owner', label:'Owner (همه دسترسی)'},
  {value:'admin', label:'Admin (همه جز owner)'},
  {value:'editor', label:'Editor (ساخت+ویرایش، بدون تنظیمات)'},
  {value:'creator', label:'Creator (فقط ساخت کلاینت)'},
  {value:'viewer', label:'Viewer (فقط دیدن)'},
];
const ROLE_COLOR:Record<string,string>={owner:'purple',admin:'blue',editor:'cyan',creator:'green',viewer:'default'};

async function fetchAdmins(): Promise<AdminUser[]>{
  const msg = await HttpUtil.post('/panel/api/users/list') as any;
  if(!msg?.success) throw new Error(msg?.msg||'failed');
  return msg.obj as AdminUser[];
}

export default function AdminsPage(){
  const qc = useQueryClient();
  const [msgApi, ctx]=message.useMessage();
  const {data, isLoading}=useQuery({queryKey:['admins'], queryFn: fetchAdmins});
  const [open, setOpen]=useState(false);
  const [form]=Form.useForm();

  const createMut = useMutation({
    mutationFn: async(v:any)=>{
      const r = await HttpUtil.post('/panel/api/users/create', v) as any;
      if(!r?.success) throw new Error(r?.msg||'failed');
      return r;
    },
    onSuccess:()=>{ msgApi.success('ادمین ساخته شد'); qc.invalidateQueries({queryKey:['admins']}); setOpen(false); form.resetFields(); },
    onError:(e:any)=> msgApi.error(e.message||'خطا'),
  });

  const deleteMut = useMutation({
    mutationFn: async(id:number)=>{
      const r = await HttpUtil.post(`/panel/api/users/delete/${id}`) as any;
      if(!r?.success) throw new Error(r?.msg||'failed');
      return r;
    },
    onSuccess:()=>{ msgApi.success('حذف شد'); qc.invalidateQueries({queryKey:['admins']}); },
    onError:(e:any)=> msgApi.error(e.message),
  });

  const toggleMut = useMutation({
    mutationFn: async(row:AdminUser)=>{
      const r = await HttpUtil.post(`/panel/api/users/update/${row.id}`, {enabled: !row.enabled}) as any;
      if(!r?.success) throw new Error(r?.msg||'failed');
      return r;
    },
    onSuccess:()=> qc.invalidateQueries({queryKey:['admins']}),
    onError:(e:any)=> msgApi.error(e.message),
  });

  const cols = [
    {title:'ID', dataIndex:'id', width:60},
    {title:'نام کاربری', dataIndex:'username'},
    {title:'نمایش', dataIndex:'displayName'},
    {title:'نقش', dataIndex:'role', render:(v:string)=><Tag color={ROLE_COLOR[v]||'default'}>{v}</Tag>},
    {title:'وضعیت', dataIndex:'enabled', render:(v:boolean,row:AdminUser)=><Switch checked={v} onChange={()=>toggleMut.mutate(row)} />},
    {title:'اینباندها', dataIndex:'inboundIds', render:(v:string)=> v? v : <Tag>همه</Tag>},
    {title:'عملیات', render:(_:any,row:AdminUser)=>(
      <Space>
        <Popconfirm title="حذف شود؟" onConfirm={()=>deleteMut.mutate(row.id)}><Button size="small" danger>حذف</Button></Popconfirm>
      </Space>
    )},
  ];

  return (
    <div className="admins-page" style={{padding:24}}>
      {ctx}
      <Card title="👥 مدیریت ادمین‌ها — KSMRX" extra={<Button type="primary" onClick={()=>setOpen(true)}>+ ادمین جدید</Button>}>
        <p style={{color:'#888'}}>نقش‌ها: <b>Viewer</b> فقط دیدن · <b>Creator</b> فقط ساخت کلاینت · <b>Editor</b> ساخت+ویرایش (بدون تنظیمات) · <b>Admin/Owner</b> کامل</p>
        <Table rowKey="id" loading={isLoading} dataSource={data||[]} columns={cols as any} pagination={false} />
      </Card>
      <Modal title="ادمین جدید" open={open} onCancel={()=>setOpen(false)} footer={null} destroyOnClose>
        <Form form={form} layout="vertical" onFinish={(v)=>createMut.mutate(v)}>
          <Form.Item name="username" label="نام کاربری" rules={[{required:true}]}><Input placeholder="admin2" /></Form.Item>
          <Form.Item name="password" label="رمز عبور" rules={[{required:true}]}><Input.Password /></Form.Item>
          <Form.Item name="displayName" label="نام نمایشی"><Input placeholder="پشتیبانی" /></Form.Item>
          <Form.Item name="role" label="نقش" initialValue="viewer"><Select options={ROLE_OPTS} /></Form.Item>
          <Form.Item name="inboundIds" label="اینباندهای مجاز (JSON آرایه یا خالی=همه)"><Input placeholder='مثلا [1,2] یا خالی' /></Form.Item>
          <Button type="primary" htmlType="submit" loading={createMut.isPending} block>ساخت</Button>
        </Form>
      </Modal>
    </div>
  );
}
