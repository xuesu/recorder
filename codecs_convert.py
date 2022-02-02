import codecs

def convert_encoding(src_encoding, dst_encoding, src_fpath, dst_fpath):
    with codecs.open(src_fpath, "r", src_encoding) as fin:
        contents = fin.read()
    with codecs.open(dst_fpath, "w", dst_encoding) as fout:
        fout.write(contents)

if __name__ == '__main__':
    convert_encoding("utf-8", "gbk", r"D:\recorder\TestTools.csv", r"C:\Users\a\OneDrive\reading\TestTools.csv")
    convert_encoding("utf-8", "gbk", r"D:\recorder\Papers.csv", r"C:\Users\a\OneDrive\reading\Papers.csv")